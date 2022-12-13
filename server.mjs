import express from 'express'
import ejs from 'ejs'
import http from 'http'
import session from 'express-session'
import { Server } from 'socket.io'
import { config } from 'dotenv'

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

app.use(express.static('static'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session_middleware)

// 라우터 사용
app.use('/account', account_router)
app.use('/friend', friend_router)

// ejs 엔진 사용
app.set('view engine', 'ejs')
app.set('views', 'views')

app.engine('html', ejs.renderFile)

app.get('/', (req, res) => res.render('index', { user: req.session.user }))

io.use(wrap)
chat_io.use(wrap)

io.on('connection', (socket) => {
	const username = socket.request.session.user
	socket.join(username)

	// 방 관련
	socket.on('room', (data) => {
		// TODO: 방 생성, 삭제, 참가
	})
	// 친구에게 채팅 요청
	socket.on('request', async (data) => {
		const { type, request_id } = data

		if (type === 'request') {
			// 요청 보내기
			if (!(await io.in(request_id).fetchSockets())) {
				socket.emit('request', {
					type: 'error',
					message: `${request_id}가 오프라인이거나 존재하지 않는 계정입니다.`
				})
				return
			}

			io.to(request_id).emit('request', { type: 'request', from_id: username })
		} else if (type === 'decline') io.to(request_id).emit('request', { type: 'decline', id: username }) // 거절
		else if (type === 'accept')
			io.to(request_id, username).emit('request', { type: 'accept', room_name: `${request_id}_${username}` }) // 수락
	})
})

chat_io.on('connection', (socket) => {
	const username = socket.request.session.user

	socket.once('room', (room_name) => socket.join(room_name))

	// 채팅
	socket.on('chat', (message) => {
		if (socket.rooms.length <= 1) return

		// TODO: 채팅 기능 구현
	})
})

server.listen(PORT, () => console.log(`[${new Date().toLocaleTimeString('en-US')}] Server started on port ${PORT}`))
