import {ClientMessage, ClientMessageSchema, Intent, ServerStartGameMessage, ServerStartGameMessageSchema, ServerTurnMessageSchema, Turn} from "../core/Schemas";
import {Config} from "../core/configuration/Config";
import {Client} from "./Client";
import WebSocket from 'ws';


export enum GamePhase {
    Lobby = 'LOBBY',
    Active = 'ACTIVE',
    Finished = 'FINISHED'
}

export class GameServer {


    private gameDuration = 20 * 60 * 1000 // TODO!!! fix this

    private turns: Turn[] = []
    private intents: Intent[] = []
    private clients: Client[] = []
    private _hasStarted = false

    private endTurnIntervalID

    constructor(
        public readonly id: string,
        public readonly createdAt: number,
        private settings: Config,
    ) { }

    public addClient(client: Client) {
        console.log(`game ${this.id} adding client ${client.id}`)
        // Remove stale client if this is a reconnect
        this.clients = this.clients.filter(c => c.id != client.id)
        this.clients.push(client)
        client.ws.on('message', (message: string) => {
            const clientMsg: ClientMessage = ClientMessageSchema.parse(JSON.parse(message))
            if (clientMsg.type == "intent") {
                if (clientMsg.gameID == this.id) {
                    this.addIntent(clientMsg.intent)
                } else {
                    console.warn(`client ${clientMsg.clientID} sent to wrong game`)
                }
            }
        })

        // In case a client joined the game late and missed the start message.
        if (this._hasStarted) {
            this.sendStartGameMsg(client.ws)
        }
    }

    public start() {
        this._hasStarted = true
        this.clients.forEach(c => {
            console.log(`game ${this.id} sending start message to ${c.id}`)
            this.sendStartGameMsg(c.ws)
        })
        this.endTurnIntervalID = setInterval(() => this.endTurn(), this.settings.turnIntervalMs());
    }

    private addIntent(intent: Intent) {
        this.intents.push(intent)
    }

    private sendStartGameMsg(ws: WebSocket) {
        ws.send(JSON.stringify(ServerStartGameMessageSchema.parse(
            {
                type: "start",
                // TODO: this could get large
                turns: this.turns
            }
        )))
    }

    private endTurn() {
        const pastTurn: Turn = {
            turnNumber: this.turns.length,
            gameID: this.id,
            intents: this.intents
        }
        this.turns.push(pastTurn)
        this.intents = []

        const msg = JSON.stringify(ServerTurnMessageSchema.parse(
            {
                type: "turn",
                turn: pastTurn
            }
        ))
        this.clients.forEach(c => {
            c.ws.send(msg)
        })

    }

    endGame() {
        // Close all WebSocket connections
        clearInterval(this.endTurnIntervalID);
        this.clients.forEach(client => {
            client.ws.removeAllListeners('message');
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close();
            }
        });
    }

    phase(): GamePhase {
        if (Date.now() - this.createdAt < this.settings.lobbyLifetime()) {
            return GamePhase.Lobby
        }
        if (Date.now() - this.createdAt < this.settings.lobbyLifetime() + this.gameDuration) {
            return GamePhase.Active
        }
        return GamePhase.Finished
    }

    hasStarted(): boolean {
        return this._hasStarted
    }

}