const socket = io();

let myName;

const messageList = document.getElementById("messageList");
const inputModal = document.getElementById("input");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const roomInput = document.getElementById("roomInput");
const usernameInput = document.getElementById("usernameInput");
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
})

socket.on("room", (data) => {
	const { type, message, username } = data;

	if (type === "error") alert(message);
	else if (type === "created" || type === "joined") startChat(username);
});

function startChat(username) {
	document.querySelector(".container").style.filter = inputModal.parentElement.style.display = "none";

	myName = username;
	console.log(myName);

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
