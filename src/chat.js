const socket = io()

let myName
let privateChatTarget
let users = []
let rooms = []

const messageList = document.getElementById("messageList")
const userList = document.getElementById("userList")
const roomList = document.getElementById("roomList")

const joinRoomDiv = document.getElementById("joinRoomDiv")
const createRoomDiv = document.getElementById("createRoomDiv")
const selectDiv = document.getElementById("select")

const userListModal = document.getElementById("userListModal")

const messageInput = document.getElementById("messageInput")
const roomInput = document.getElementById("roomInput")
const createUsernameInput = createRoomDiv.querySelector(".username-input")
const joinUsernameInput = joinRoomDiv.querySelector(".username-input")
const maxUsersInput = document.getElementById("maxUsersInput")

const sendButton = document.getElementById("sendButton")
const createRoomButton = document.getElementById("createRoomButton")
const toggleCreateRoomButton = document.getElementById("toggleCreateRoomButton")
const toggleJoinRoomButton = document.getElementById("toggleJoinRoomButton")
const refreshButton = document.getElementById("refreshButton")

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

function setRoomList(rooms) {
	roomList.innerHTML = ""

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
		joinButton.addEventListener("click", () => roomRequest(rooms[i].roomName, joinUsernameInput.value, "joinRoom"))

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

const createRoomEvent = () => roomRequest(roomInput.value, createUsernameInput.value, "createRoom")
setTimeout(() => createRoomButton.addEventListener("click", createRoomEvent), 3000)

toggleCreateRoomButton.addEventListener("click", () => {
	createRoomDiv.style.display = "block"
	selectDiv.style.display = "none"
})
toggleJoinRoomButton.addEventListener("click", () => {
	socket.emit("room", { type: "roomList" })

	joinRoomDiv.style.display = "block"
	selectDiv.style.display = "none"
})
createRoomDiv.querySelector(".button.cancel").addEventListener("click", () => {
	createRoomDiv.style.display = "none"
	selectDiv.style.display = "block"
})
joinRoomDiv.querySelector(".button.cancel").addEventListener("click", () => {
	joinRoomDiv.style.display = "none"
	selectDiv.style.display = "block"
})
refreshButton.addEventListener("click", () => socket.emit("room", { type: "roomList" }))
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
