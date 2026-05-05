import 'reflect-metadata'
import { Server } from './presentation/server/server';


(async () => {
    const server = new Server()
    await server.start();
})()