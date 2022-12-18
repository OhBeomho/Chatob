const socket = io('/chat')
const room = new URL(location.href).searchParams.get('room')
const textarea = document.querySelector('textarea')
const message_list = document.querySelector('ul')
let my_username

socket.on('room', (data1, data2) => {
	if (data1 === 'NE') alert('존재하지 않는 방입니다.')
	else if (data1 === 'F') alert('방 인원이 가득 찼습니다.')
	else {
		my_username = data1
		document.querySelector('#max_users').innerHTML = data2

		socket.removeAllListeners('room')

		textarea.addEventListener('keydown', (e) => {
			if (!e.repeat && !e.shiftKey && e.key === 'Enter') {
				e.preventDefault()
				send(textarea.value)
			}
		})

		return
	}

	window.close()
})

socket.on('chat', (data) => {
	if (!my_username) return

	const { username, message } = data
	const time = new Date().toLocaleTimeString('en-US')
	const message_element = document.createElement('li')

	if (username === 'S') {
		message_element.className = 's'
		message_element.innerHTML = `<span>${message}</span>`

		document.querySelector('#users').innerHTML = data.users
	} else {
		message_element.className = username === my_username ? 'me' : 'other'
		message_element.innerHTML = `
			<div style="padding: 0 5px; text-align: center">
				<img src="/images/user.png" alt="" />
				<br />
				<span>${username}</span>
			</div>
			<div class="chat-bubble">${message}</div>
			<div style="margin: 10px 4px; color: gray; font-size: 12px">${time}</div>
		`
	}

	message_list.appendChild(message_element)
	message_list.scrollTo(0, message_list.scrollHeight)
})

socket.emit('room', room)

function send(text) {
	if (!text.trim() || text.length > 200) return

	socket.emit('chat', text)
	textarea.value = ''
}
