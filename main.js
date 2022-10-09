const express = require("express");
const app = express();

const http = require("http");
const server = http.createServer(app);

const socketIO = require("socket.io");
const io = new socketIO.Server(server);

const dayjs = require("dayjs");
const path = require("path");

app.use(express.static(path.join(__dirname, "src")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "src", "index.html")));

const rooms = [];

class Room {
	constructor(roomName) {
		this.roomName = roomName;
		this.users = [];
	}

	join(username) {
		this.users.push(username);
	}

	leave(username) {
		this.users.splice(this.users.indexOf(username), 1);
	}
}

io.on("connection", (socket) => {
	let joinedRoom, clientName;

	socket.on("room", (data) => {
		const { username, type, roomName } = data;

		const findRoom = (roomName) => rooms.find((r) => r.roomName === roomName);
		const createRoom = (roomName) => {
			const room = new Room(roomName);
			room.join(username);

			socket.join(roomName);
			rooms.push(room);

			joinedRoom = room;
			clientName = username;
		};

		if (type === "createRoom") {
			if (findRoom(roomName)) {
				socket.emit("room", {
					type: "error",
					message: `Room ${roomName} already exists.`
				});
				return;
			}

			createRoom(roomName);

			socket.emit("room", { type: "created", username });
			io.to(roomName).emit("chatting", {
				type: "announce",
				message: username + " joined."
			});
		} else if (type === "joinRoom") {
			const room = findRoom(roomName);

			if (!room) {
				socket.emit("room", {
					type: "error",
					message: `Room ${roomName} does not exists.`
				});
				return;
			} else if (room.users.includes(username)) {
				socket.emit("room", {
					type: "error",
					message: `Someone is already using your username. '${username}'`
				});
				return;
			}

			clientName = username;
			joinedRoom = room;

			room.join(username);
			socket.join(roomName);

			socket.emit("room", { type: "joined", username, userList: room.users });
			io.to(roomName).emit("chatting", {
				type: "announce",
				message: username + " joined."
			});
			io.to(joinedRoom.roomName).emit("room", {
				type: "userList",
				userList: room.users
			});
		}
	});
	socket.on("chatting", (message) =>
		io.to(joinedRoom.roomName).emit("chatting", {
			type: "general",
			message,
			time: dayjs(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })).format("h:mm A"),
			username: clientName
		})
	);
	socket.on("disconnect", () => {
		if (joinedRoom) {
			socket.to(joinedRoom.roomName).emit("chatting", {
				type: "announce",
				message: clientName + " left."
			});
			socket.to(joinedRoom.roomName).emit("room", {
				type: "userList",
				userList: joinedRoom.users
			});

			joinedRoom.leave(clientName);
			if (joinedRoom.users.length === 0) rooms.splice(rooms.indexOf(joinedRoom), 1);
		}
	});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server started. PORT: " + PORT));
