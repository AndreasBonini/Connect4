
export default class Messages
{
    static handlers = {};

    static registerHandler(cmd, handler)
    {
        Messages.handlers[cmd] = handler;
    }

    static sendMessage(ws, cmd, obj)
    {
        obj = obj ?? {};
        if (Array.isArray(ws))
            ws.map(socket => this.sendMessage(socket, cmd, obj));

        obj.cmd = cmd;
        ws.send(JSON.stringify(obj));
    }

    static tryParseAndExecuteMessage(ws, messageAsString)
    {
        try {
            const message = JSON.parse(messageAsString);

            if (!Messages.handlers[message.cmd])
                return [false, new Error("Unknown command: " + message.cmd)]

            Messages.handlers[message.cmd](ws, message);

            return [true, null];
        }
        catch (error)
        {
            console.log('Error in tryParseAndExecuteMessage', error);
        return [false, error];
        }
    }

    static sendError(ws, errorAsString)
    {
        Messages.sendMessage(ws, 'ERROR', { error: errorAsString })
    }

    /*
    static sendGameUpdates(clients, game, cmd, obj)
    {
        for (const [ws, metadata] of Object.entries(clients))
        {
            if (metadata.game == game)
                Messages.sendMessage(ws, cmd, obj);
        }
    }
    */
}




