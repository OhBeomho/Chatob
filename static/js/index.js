const socket = io('/')

socket.on('request', (data) => {
	const { type } = data

	if (type === 'ERROR') alert(data.message)
	else if (type === 'DECLINE') alert(data.id + '님이 채팅 요청을 거절하였습니다.')
	else if (type === 'ACCEPT') open_chat('/chat?room=' + data.room_name)
	else if (type === 'REQUEST') {
		if (confirm(data.from_id + '님이 채팅 요청을 보냈습니다.\n'))
			socket.emit('request', { type: 'ACCEPT', request_id: data.from_id })
		else {
			socket.emit('request', { type: 'DECLINE', request_id: data.from_id })
			alert(data.from_id + '님의 채팅 요청을 거절하였습니다.')
		}
	}
})
socket.on('create_room', (data) => {
	if (data === 'EXISTS') alert('다른 방 이름을 사용해 주세요.')
	else open_chat('/chat?room=' + data)
})

function create_room(room_name, max_users) {
	if (!room_name || max_users < 2 || max_users > 100) return

	socket.emit('create_room', { room_name, max_users })
}

function chat_request(id) {
	socket.emit('request', { type: 'REQUEST', request_id: id })
}

function friend_request(id) {
	xhr('GET', '/friend/request/' + id, (status, response) => {
		if (status === 200) {
			alert('친구 요청을 보냈습니다.')
		} else if (status === 500) {
			alert('서버에서 오류가 발생했습니다.')
			console.error(response)
		}
	})
}

function accept_request(id) {
	xhr('GET', '/friend/accept/' + id, (status, response) => {
		if (status === 200) {
			alert(id + '님의 친구 요청을 수락했습니다.')
			location.reload()
		} else if (status === 500) {
			alert('서버에서 오류가 발생했습니다.')
			console.error(response)
		}
	})
}

function decline_request(id) {
	xhr('GET', '/friend/decline/' + id, (status, response) => {
		if (status === 200) {
			alert(id + '님의 친구 요청을 거절했습니다.')
			location.reload()
		} else if (status === 500) {
			alert('서버에서 오류가 발생했습니다.')
			console.error(response)
		}
	})
}

function remove_friend(id) {
	xhr('GET', '/friend/remove/' + id, (status, response) => {
		if (status === 200) {
			alert(id + '님을 친구 목록에서 삭제하였습니다.')
			location.reload()
		} else if (status === 500) {
			alert('서버에서 오류가 발생했습니다.')
			console.error(response)
		}
	})
}

function xhr(method, url, callback) {
	const xhr = new XMLHttpRequest()
	xhr.open(method, url)
	xhr.send()
	xhr.onreadystatechange = () => {
		if (xhr.readyState === XMLHttpRequest.DONE) callback(xhr.status, xhr.response)
	}
}

// https://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
function open_chat(url) {
	if (/Mobi/i.test(navigator.userAgent)) {
		window.open(url, '_blank').focus()
	} else {
		const width = 500
		const height = 800
		const dual_screen_left = window.screenLeft != undefined ? window.screenLeft : screen.left
		const dual_screen_top = window.screenTop != undefined ? window.screenTop : screen.top
		const screen_width = window.innerWidth || document.documentElement.clientWidth || screen.width
		const screen_height = window.innerHeight || document.documentElement.clientHeight || screen.height
		const left = screen_width / 2 - width / 2 + dual_screen_left
		const top = screen_height / 2 - height / 2 + dual_screen_top

		window
			.open(url, 'Chatob', `scrollbars=yes,resizable=0,width=${width},height=${height},top=${top},left=${left}`)
			.focus()
	}
}
