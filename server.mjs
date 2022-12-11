import express from 'express'
import ejs from 'ejs'
import http from 'http'
import session from 'express-session'
import account_router from './routers/account.mjs'
import chat_router from './routers/chat.mjs'
import { Server } from 'socket.io'
import { config } from 'dotenv'

config()

const { PORT, COOKIE_SECRET } = process.env
const app = express()
const server = http.createServer(app)
const io = new Server(server)
const session_middleware = session({
	secret: COOKIE_SECRET,
	resave: true,
	saveUninitialized: true
})

app.use(express.static('static'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session_middleware)
app.use('/chat', chat_router)
app.use('/account', account_router)

app.set('view engine', 'ejs')
app.set('views', 'views')

app.engine('html', ejs.renderFile)

app.get('/', (req, res) => res.render('index', { user: req.session.user }))

io.use((socket, next) => session_middleware(socket.request, {}, next))
io.on('connection', (socket) => {
	const username = socket.request.session.user
	

	socket.on('chatting', (message) => {})
})

server.listen(PORT, () => console.log(`[${new Date().toLocaleTimeString('en-US')}] Server started on port ${PORT}`))
