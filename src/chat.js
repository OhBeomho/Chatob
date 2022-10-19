const socket = io()

let myName
let privateChatTarget
let users = []
let rooms = []

const messageList = document.getElementById("messageList")
const userList = document.getElementById("userList")
const roomList = document.getElementById("roomList")

const userListModal = document.getElementById("userListModal")

const messageInput = document.getElementById("messageInput")
const roomInput = document.getElementById("roomInput")
const usernameInput = document.getElementById("usernameInput")
const maxUsersInput = document.getElementById("maxUsersInput")

const sendButton = document.getElementById("sendButton")
const createRoomButton = document.getElementById("createRoomButton")
const toggleCreateRoomButton = document.getElementById("toggleCreateRoomButton")
const toggleRoomListButton = document.getElementById("toggleRoomListButton")
const joinRoomButton = document.getElementById("joinRoomButton")

function addMessage(username, text, time, mention, private = false) {
	const className = username === myName ? "me" : "other"
	const message = document.createElement("li")
	message.classList.add("message", className)
	message.innerHTML = `
		<div class="profile">
			<img src="./images/user.png" />
			<div>${username}</div>
		</div>
		<div class="content">
			<div class="message-bubble">${text}</div>
			<div class="time">${time}</div>
		</div>
	`
	if (mention) {
		if (private) message.style.backgroundColor = "rgb(240, 240, 240)"
		else if (mention === myName) message.style.backgroundColor = "rgba(255, 255, 0, 0.15)"
	}

	messageList.appendChild(message)
	messageList.scrollTo(0, messageList.scrollHeight)
}

function setUsers(users) {
	userList.innerHTML = ""

	for (let userObj of users) {
		const user = document.createElement("li")
		user.className = "user"
		if (userObj.username === myName) user.classList.add("me")
		user.innerHTML = `
			<img src="./images/user.png" alt="" class="">
			<div>${userObj.username}</div>
		`

		if (userObj.username === myName) userList.prepend(user)
		else userList.appendChild(user)
	}
}

const refreshButton = document.createElement("button")
refreshButton.innerHTML = `<svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32px" height="32px"><path d="M 16 4 C 10.886719 4 6.617188 7.160156 4.875 11.625 L 6.71875 12.375 C 8.175781 8.640625 11.710938 6 16 6 C 19.242188 6 22.132813 7.589844 23.9375 10 L 20 10 L 20 12 L 27 12 L 27 5 L 25 5 L 25 8.09375 C 22.808594 5.582031 19.570313 4 16 4 Z M 25.28125 19.625 C 23.824219 23.359375 20.289063 26 16 26 C 12.722656 26 9.84375 24.386719 8.03125 22 L 12 22 L 12 20 L 5 20 L 5 27 L 7 27 L 7 23.90625 C 9.1875 26.386719 12.394531 28 16 28 C 21.113281 28 25.382813 24.839844 27.125 20.375 Z"/></svg>`
refreshButton.classList.add("button", "refresh")
refreshButton.addEventListener("click", () => socket.emit("room", { type: "roomList" }))

function setRoomList(rooms) {
	roomList.innerHTML = `
		<div style="position: absolute; top: 0; width: 100%; text-align: center">
			<h1>Room List</h1>
		</div>
	`
	roomList.appendChild(refreshButton)

	if (rooms.length === 0) {
		const noRooms = document.createElement("div")
		noRooms.style.color = "gray"
		noRooms.innerText = "No rooms found."
		roomList.appendChild(noRooms)

		return
	}

	for (let i = 0; i < (rooms.length < 10 ? rooms.length : 10); i++) {
		const room = document.createElement("div")
		room.className = "roomDiv"
		room.innerHTML = `
			<h2>${rooms[i].roomName}</h2>
			<div class="users">Users: ${rooms[i].users.length}/${rooms[i].maxUsers}</div>
		`

		const joinButton = document.createElement("button")
		joinButton.className = "button"
		joinButton.innerText = "Join"
		joinButton.addEventListener("click", () => {
			roomInput.value = rooms[i].roomName
			joinRoomButton.click()
		})

		room.appendChild(joinButton)
		roomList.appendChild(room)
	}
}

function announce(text) {
	const message = document.createElement("li")
	message.classList.add("message", "announce")
	message.innerText = text
	messageList.appendChild(message)
	messageList.scrollTo(0, messageList.scrollHeight)
}

function error(text) {
	const message = document.createElement("li")
	message.classList.add("message", "error")
	message.innerText = text
	messageList.appendChild(message)
	messageList.scrollTo(0, messageList.scrollHeight)
}

const createRoomEvent = () => roomRequest(roomInput.value, usernameInput.value, "createRoom")
const joinRoomEvent = () => roomRequest(roomInput.value, usernameInput.value, "joinRoom")
setTimeout(() => {
	createRoomButton.addEventListener("click", createRoomEvent)
	joinRoomButton.addEventListener("click", joinRoomEvent)
}, 3000)

toggleCreateRoomButton.addEventListener("click", () => {
	const createRoomDiv = document.getElementById("createRoomDiv")
	createRoomDiv.style.display = createRoomDiv.style.display === "block" ? "none" : "block"
})
toggleRoomListButton.addEventListener("click", () => {
	socket.emit("room", { type: "roomList" })

	roomList.style.display = roomList.style.display === "grid" ? "none" : "grid"
})
messageInput.addEventListener("keydown", (e) => {
	const key = e.key.toLowerCase()

	if (key === "enter" && !e.shiftKey) {
		e.preventDefault()
		chat(messageInput.value)
	}
})
messageInput.addEventListener("animationend", () => (messageInput.style.animation = "none"))
sendButton.addEventListener("click", () => chat(messageInput.value))
document
	.getElementById("showUserList")
	.addEventListener("click", () => (userListModal.parentElement.style.display = "flex"))
userListModal
	.querySelector("#close")
	.addEventListener("click", () => (userListModal.parentElement.style.display = "none"))

function chat(message) {
	if (!message.trim()) {
		messageInput.style.animation = "invalidAnimation 0.4s"
		return
	}

	if (message === ":public") {
		privateChatTarget = null

		document.getElementById("private").style.display = "none"
		messageInput.value = ""

		return
	} else if (message.startsWith(":private")) {
		const splitMessage = message.split(":")
		const username = splitMessage[2]

		if (!users.find((user) => user.username === username)) {
			error(`User '${username}' does not exists.`)
			return
		} else if (username === myName) {
			error("You cannot private chat with you.")
			return
		}

		privateChatTarget = username

		const privateChatting = document.getElementById("private")
		privateChatting.innerHTML = `
			Private<br />
			<strong>${username}</strong>
		`
		privateChatting.style.display = "block"

		messageInput.value = ""

		return
	}

	String.prototype.replaceString = function (start, end = this.length, newString) {
		return this.slice(0, start) + newString + this.slice(start + Math.abs(end))
	}

	const splitMessage = message.split(/[\s,]/)
	for (let word of splitMessage) {
		if (
			/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(
				word
			)
		)
			message = message.replaceString(
				message.indexOf(word),
				message.indexOf(word) + word.length,
				`<a href="${word}">${word}</a>`
			)
	}

	socket.emit("chatting", {
		message,
		to: privateChatTarget
	})
	messageInput.value = ""
	messageInput.focus()
}

socket.on("room", (data) => {
	const { type, message, username, roomName } = data

	if (type === "error") alert(message)
	else if (type === "created" || type === "joined") {
		if (type === "created") users.push(username)
		startChat(username)
		document.getElementById("roomName").innerHTML = `Room Name<br /><strong>${roomName}</strong>`
	}

	if (type === "userList") {
		users = data.userList
		setUsers(users)
	} else if (type === "roomList") {
		rooms = data.roomList
		setRoomList(rooms)
	}
})

function startChat(username) {
	document.querySelector(".room").style.animation = "fadeOutAnimation 2s forwards"
	setTimeout(() => document.querySelector(".room").remove(), 2000)

	createRoomButton.removeEventListener("click", createRoomEvent)
	joinRoomButton.removeEventListener("click", joinRoomEvent)

	myName = username
	setUsers(users)

	socket.on("chatting", (data) => {
		const { type, message } = data

		if (type === "announce") announce(message)
		else {
			const { username, time, mention, private } = data

			addMessage(username, message, time, mention, private)
		}
	})
}

function roomRequest(roomName, username, type) {
	if (!roomName) return alert("Please enter room name.")
	else if (!username) return alert("Please enter username.")
	else if (roomName.length > 20) return alert("Your room name is so long.")
	else if (username.length > 20) return alert("Your username is so long.")

	if (type === "createRoom") {
		const maxUsers = Number(maxUsersInput.value)

		if (!maxUsers) return alert("Please enter max number of users.")
		else if (maxUsers < 2) return alert("The max number of users must be at least 2.")
		else if (maxUsers > 100) return alert("The max number of users must be a maximum of 100.")

		return socket.emit("room", {
			type,
			username,
			roomName,
			maxUsers
		})
	}

	socket.emit("room", {
		type,
		username,
		roomName
	})
}
