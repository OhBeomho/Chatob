const socket = io()

let myName
let privateChatTarget
let users = []

const messageList = document.getElementById("messageList")
const userList = document.getElementById("userList")

const inputModal = document.getElementById("inputModal")
const userListModal = document.getElementById("userListModal")

const messageInput = document.getElementById("messageInput")
const roomInput = document.getElementById("roomInput")
const usernameInput = document.getElementById("usernameInput")
const maxUsersInput = document.getElementById("maxUsersInput")

const sendButton = document.getElementById("sendButton")
const createRoomButton = document.getElementById("createRoomButton")
const toggleCreateRoomButton = document.getElementById("toggleCreateRoomButton")
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

createRoomButton.addEventListener("click", () => roomRequest(roomInput.value, usernameInput.value, "createRoom"))
joinRoomButton.addEventListener("click", () => roomRequest(roomInput.value, usernameInput.value, "joinRoom"))
toggleCreateRoomButton.addEventListener("click", () => {
	const createRoomDiv = document.getElementById("createRoomDiv")
	createRoomDiv.style.display = createRoomDiv.style.display === "block" ? "none" : "block"
})
messageInput.addEventListener("keydown", (e) => {
	const key = e.key.toLowerCase()

	if (key === "enter" && !e.shiftKey) {
		e.preventDefault()
		chat(messageInput.value)
	}
})
sendButton.addEventListener("click", () => chat(messageInput.value))
document
	.getElementById("showUserList")
	.addEventListener("click", () => (userListModal.parentElement.style.display = "flex"))
userListModal
	.querySelector("#close")
	.addEventListener("click", () => (userListModal.parentElement.style.display = "none"))

function chat(message) {
	if (message === ":public") {
		privateChatTarget = null

		document.getElementById("priv").remove()
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

		const privateChatting = document.createElement("div")
		privateChatting.style.color = "gray"
		privateChatting.id = "priv"
		privateChatting.innerHTML = `
			Private<br />
			<strong>${username}</strong>
		`;
		document.querySelector(".inputs").prepend(privateChatting)

		messageInput.value = ""

		return
	}

	socket.emit("chatting", {
		message,
		to: privateChatTarget
	})
	messageInput.value = ""
}

socket.on("room", (data) => {
	const { type, message, username } = data

	if (type === "error") alert(message)
	else if (type === "created" || type === "joined") {
		if (type === "created") users.push(username)
		startChat(username)
	}

	if (type === "userList") {
		users = data.userList
		setUsers(users)
	}
})

function startChat(username) {
	document.querySelector(".container").style.filter = inputModal.parentElement.style.display = "none"

	myName = username
	setUsers(users)

	socket.on("chatting", (data) => {
		const { type, message } = data

		if (type === "announce") announce(message)
		else {
			const { username, time, mention, privateChatting } = data

			if (privateChatting) addMessage(username, message, time, mention, true)
			else addMessage(username, message, time, mention)
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
