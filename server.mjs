import express, { application } from 'express'
import ejs from 'ejs'
import http from 'http'
import session from 'express-session'
import { Server } from 'socket.io'
import { config } from 'dotenv'
import { Account } from './database.mjs'

// 라우터
import account_router from './routers/account.mjs'
import friend_router from './routers/friend.mjs'

config()

// 환경변수 불러오기
const { PORT, COOKIE_SECRET } = process.env

// Express 서버 생성
const app = express()
const server = http.createServer(app)

// socket.io 서버 생성
const io = new Server(server)
const chat_io = io.of('/chat')

// Express 세션 미들웨어
const session_middleware = session({
	secret: COOKIE_SECRET,
	resave: true,
	saveUninitialized: true
})
// Express 세션을 socket.io 에서 사용할 수 있게
const wrap = (socket, next) => session_middleware(socket.request, {}, next)

// static 폴더
app.use(express.static('static'))
// post 요청 body 받을 수 있게
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// 세션 미들웨어 사용
app.use(session_middleware)

// 라우터 사용
app.use('/account', account_router)
app.use('/friend', friend_router)

// ejs 엔진 사용
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

// 세션 미들웨어 사용
io.use(wrap)
chat_io.use(wrap)

// 방 목록
const rooms = []

io.on('connection', (socket) => {
	const username = socket.request.session.user
	socket.join(username)

	// 방 생성
	socket.on('create_room', (data) => {
		const { room_name, max_users } = data
		if (rooms.find((room) => room.room_name === room_name)) {
			socket.emit('create_room', 'EXISTS')
			return
		}

		rooms.push({ room_name, users: 0, max_users })
		socket.emit('create_room', room_name)
	})

	// 친구에게 채팅 요청
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
			else io.to(request_id).emit('request', { type: 'REQUEST', from_id: username }) // 요청 보내기
		} else if (type === 'DECLINE') io.to(request_id).emit('request', { type: 'DECLINE', id: username }) // 거절
		else if (type === 'ACCEPT') {
			if (await chat_io.in(request_id).fetchSockets().length) {
				socket.emit('request', {
					type: 'ERROR',
					message: `${request_id}님이 이미 채팅 중입니다.`
				})
			} else {
				const room_name = `${request_id}_${username}`
				rooms.push({ room_name, users: 0, max_users: 2 })
				io.to(request_id).to(username).emit('request', { type: 'ACCEPT', room_name }) // 수락
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

		if (!room) socket.emit('room', 'NOT_EXISTS')
		else if (room.users >= room.max_users) socket.emit('room', 'FULL')
		else {
			room.users++
			current_room = room

			socket.join(room_name)
			socket.emit('room', 'JOINED')
			socket.removeAllListeners('room')
		}
	})

	// 채팅
	socket.on('chat', (message) => {
		if (!current_room) return

		io.to(current_room.room_name).emit('chat', {
			username,
			message
		})
	})

	// 채팅을 나갔을 때
	socket.on('disconnect', () => {
		if (current_room) {
			current_room.users--
			if (current_room.users <= 0) rooms.splice(rooms.indexOf(current_room), 1)
		}
	})
})

server.listen(PORT, () => console.log(`[${new Date().toLocaleTimeString('en-US')}] Server started on port ${PORT}`))
