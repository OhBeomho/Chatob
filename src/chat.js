const socket = io();

let myName;
let users = [];

const messageList = document.getElementById("messageList");
const userList = document.getElementById("userList");

const inputModal = document.getElementById("inputModal");
const userListModal = document.getElementById("userListModal");

const messageInput = document.getElementById("messageInput");
const roomInput = document.getElementById("roomInput");
const usernameInput = document.getElementById("usernameInput");

const sendButton = document.getElementById("sendButton");
const createRoomButton = document.getElementById("createRoomButton");
const joinRoomButton = document.getElementById("joinRoomButton");

function addMessage(username, text, time) {
	const className = username === myName ? "me" : "other";
	const message = document.createElement("li");
	message.classList.add("message", className);
	message.innerHTML = `
		<div class="profile">
			<img src="./images/user.png" />
			<div>${username}</div>
		</div>
		<div class="content">
			<div class="message-bubble">${text}</div>
			<div class="time">${time}</div>
		</div>
	`;
	messageList.appendChild(message);
	messageList.scrollTo(0, messageList.scrollHeight);
}

function setUsers(users) {
	userList.innerHTML = "";

	for (let username of users) {
		const user = document.createElement("li");
		user.className = "user";
		if (username === myName) user.classList.add("me");
		user.innerHTML = `
			<img src="./images/user.png" alt="" class="">
			<div>${username}</div>
		`;

		if (username === myName) userList.prepend(user);
		else userList.appendChild(user);
	}
}

function announce(text) {
	const message = document.createElement("li");
	message.classList.add("message", "announce");
	message.innerText = text;
	messageList.appendChild(message);
	messageList.scrollTo(0, messageList.scrollHeight);
}

createRoomButton.addEventListener("click", () => roomRequest(roomInput.value, usernameInput.value, "createRoom"));
joinRoomButton.addEventListener("click", () => roomRequest(roomInput.value, usernameInput.value, "joinRoom"));
messageInput.addEventListener("keydown", (e) => {
	const key = e.key.toLowerCase();

	if (key === "enter" && !e.shiftKey) {
		e.preventDefault();

		if (!messageInput.value) return;

		socket.emit("chatting", messageInput.value);
		messageInput.value = "";
	}
});
sendButton.addEventListener("click", () => {
	if (!messageInput.value) return;

	socket.emit("chatting", messageInput.value);
	messageInput.value = "";
});
document
	.getElementById("showUserList")
	.addEventListener("click", () => (userListModal.parentElement.style.display = "flex"));
userListModal
	.querySelector("#close")
	.addEventListener("click", () => (userListModal.parentElement.style.display = "none"));

socket.on("room", (data) => {
	const { type, message, username } = data;

	if (type === "error") alert(message);
	else if (type === "created" || type === "joined") {
		if (type === "created") users.push(username);
		startChat(username);
	}

	if (type === "userList") {
		users = data.userList;
		setUsers(users);
	}
});

function startChat(username) {
	document.querySelector(".container").style.filter = inputModal.parentElement.style.display = "none";

	myName = username;
	setUsers(users);

	socket.on("chatting", (data) => {
		const { type, message } = data;

		if (type === "announce") announce(message);
		else {
			const { username, time } = data;
			addMessage(username, message, time);
		}
	});
}

function roomRequest(roomName, username, type) {
	if (!roomName) {
		alert("Please enter room name.");
		return;
	} else if (!username) {
		alert("Please enter username.");
		return;
	} else if (roomName.length > 20) {
		alert("Your room name is so long.");
		return;
	} else if (username.length > 20) {
		alert("Your username is so long.");
		return;
	}

	socket.emit("room", {
		type,
		username,
		roomName
	});
}
