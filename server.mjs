import express from 'express'
import ejs from 'ejs'
import http from 'http'
import session from 'express-session'
import { Server } from 'socket.io'
import { config } from 'dotenv'
import { Account } from './database.mjs'

import account_router from './routers/account.mjs'
import friend_router from './routers/friend.mjs'

config()

const { PORT, COOKIE_SECRET } = process.env

const app = express()
const server = http.createServer(app)

const io = new Server(server)
const chat_io = io.of('/chat')

const session_middleware = session({
	secret: COOKIE_SECRET,
	resave: true,
	saveUninitialized: true
})
const wrap = (socket, next) => session_middleware(socket.request, {}, next)

app.use(express.static('static'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session_middleware)

app.use('/account', account_router)
app.use('/friend', friend_router)

app.set('view engine', 'ejs')
app.set('views', 'views')

app.engine('html', ejs.renderFile)

app.get('/', (req, res) => {
	if (!req.session.user) res.render('index', { id: null })
	else
		Account.get(req.session.user).then(async (data) => {
			const online_array = await Promise.all(data.friends.map((friend) => io.in(friend).fetchSockets()))
			const chatting_array = await Promise.all(data.friends.map((friend) => chat_io.in(friend).fetchSockets()))

			data.friends = data.friends.map((friend, i) => ({
				name: friend,
				online: online_array[i][0] !== undefined,
				chatting: chatting_array[i][0] !== undefined
			}))

			res.render('index', data)
		})
})
app.get('/chat', (req, res) => {
	if (!req.session.user) res.render('error', { err: '로그인을 해 주세요.' })
	else res.render('chat.html')
})

io.use(wrap)
chat_io.use(wrap)

const rooms = []

io.on('connection', (socket) => {
	const username = socket.request.session.user
	socket.join(username)

	socket.on('create_room', (data) => {
		const { room_name, max_users } = data
		if (rooms.find((room) => room.room_name === room_name)) {
			socket.emit('create_room', 'EXISTS')
			return
		}

		rooms.push({ room_name, users: 0, max_users })
		socket.emit('create_room', room_name)
	})

	socket.on('request', async (data) => {
		const { type, request_id } = data

		if (type === 'REQUEST') {
			if (!(await io.in(request_id).fetchSockets())[0])
				socket.emit('request', {
					type: 'ERROR',
					message: `${request_id}님이 오프라인이거나 존재하지 않는 계정입니다.`
				})
			else if ((await chat_io.in(request_id).fetchSockets())[0])
				socket.emit('request', {
					type: 'ERROR',
					message: `${request_id}님이 이미 채팅 중입니다.`
				})
			else io.to(request_id).emit('request', { type: 'REQUEST', from_id: username })
		} else if (type === 'DECLINE') io.to(request_id).emit('request', { type: 'DECLINE', id: username })
		else if (type === 'ACCEPT') {
			if (await chat_io.in(request_id).fetchSockets().length) {
				socket.emit('request', {
					type: 'ERROR',
					message: `${request_id}님이 이미 채팅 중입니다.`
				})
			} else {
				const room_name = `${request_id}_${username}`
				rooms.push({ room_name, users: 0, max_users: 2 })
				io.to(request_id).to(username).emit('request', { type: 'ACCEPT', room_name })
			}
		}
	})
})

chat_io.on('connection', (socket) => {
	const username = socket.request.session.user
	socket.join(username)

	let current_room

	socket.on('room', (room_name) => {
		const room = rooms.find((room) => room.room_name === room_name)

		if (!room) socket.emit('room', 'NE')
		else if (room.users >= room.max_users) socket.emit('room', 'F')
		else {
			room.users++
			current_room = room

			socket.join(room_name)
			socket.emit('room', username, room.max_users)
			socket.removeAllListeners('room')

			chat_io.to(room_name).emit('chat', {
				username: 'S',
				message: username + '님이 입장하였습니다.',
				users: current_room.users
			})
		}
	})

	socket.on('chat', (message) => {
		if (!current_room) return

		chat_io.to(current_room.room_name).emit('chat', {
			username,
			message
		})
	})

	socket.on('disconnect', () => {
		if (current_room) {
			current_room.users--
			if (current_room.users <= 0) rooms.splice(rooms.indexOf(current_room), 1)

			chat_io.to(current_room.room_name).emit('chat', {
				username: 'S',
				message: username + '님이 퇴장하였습니다.',
				users: current_room.users
			})
		}
	})
})

server.listen(PORT, () => console.log(`[${new Date().toLocaleTimeString('en-US')}] Server started on port ${PORT}`))
