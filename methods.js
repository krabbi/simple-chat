import {Meteor} from 'meteor/meteor'
import {check} from 'meteor/check'
import {Match} from 'meteor/check'
import {Chats} from './collections'
import {Rooms} from './collections'
import {SimpleChat} from './config'
Meteor.methods({
    "SimpleChat.newMessage": function (message, roomId, username, avatar, name, custom) {
        check(message, String);
        check(roomId, String);
        check(username, Match.Maybe(String));
        check(avatar, Match.Maybe(String));
        check(name, Match.Maybe(String));
        check(custom, Match.Any );

        this.unblock()
        if (!SimpleChat.options.allow.call(this, message, roomId, username, avatar, name))
            throw new Meteor.Error(403, "Access deny")
        message=_.escape(message)

        const msg={
            message,
            roomId,
            username,
            name,
            sent: !this.isSimulation,
            receivedBy: [],
            receivedAll: false,
            viewedBy: [],
            viewedAll: false,
            deletedBy: [],
            deletedAll: false,
            userId: this.userId,
            avatar,
            custom,
            date: new Date()
        }
        msg._id=Chats.insert(msg)
        SimpleChat.options.onNewMessage(msg)
        return msg
    },
    "SimpleChat.deleteMessage": function (id, username) {
        check(id, String);
        check(username, String);
        this.unblock()
        if (!SimpleChat.options.allowLocalDelete) return false;
        const message = Chats.findOne(id, {fields: {roomId: 1, deletedBy: 1}})
        if (!message)
            throw Meteor.Error(403, "Message does not exist")
        const room = Rooms.findOne(message.roomId)
        if (!_.contains(message.deletedBy, username)) {
            if(this.isSimulation){
                return Chats.update(id, {
                    $addToSet: {deletedBy: username}
                })
            } else {
                return Chats.update(id, {
                    $addToSet: {deletedBy: username},
                    $set: {deletedAll: room.usernames.length - 2 <= message.deletedBy.length}
                })
            }
        }
        return false
    },
    "SimpleChat.deleteMessagesInRoom": function (roomId, username) {
        check(roomId, String);
        check(username, String);
        this.unblock()
        if (!SimpleChat.options.allowLocalDelete) return false;
        const room = Rooms.findOne(roomId)
        if (!room)
            throw Meteor.Error(403, "Room does not exist")
        return Chats.update({roomId: room._id}, {
            $addToSet: {deletedBy: username}
        },{multi:true})
    }
});