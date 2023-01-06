import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { MoreThan, Repository, RepositoryNotTreeError } from 'typeorm';
import { unreadMessagesResponse } from 'types';
import { Conversation } from './entities/conversation.entity';
import { conversationRole } from './conversationRole.enum';
import { ConversationToUser } from './entities/conversationToUser.entity';
import { createConversationDto } from './dtos/createConversation.dto';
import { updateRoleDto } from './dtos/updateRole.dto';
import { Message } from './entities/message.entity';
import * as bcrypt from 'bcrypt';
import { conversationRestrictionEnum } from './conversationRestriction.enum';
import { ConversationRestriction } from './entities/conversationRestriction.entity';

@Injectable()
export class ConversationsService {
    constructor(
        @InjectRepository(Conversation) private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(ConversationToUser) private readonly conversationToUserRepository: Repository<ConversationToUser>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
        @InjectRepository(ConversationRestriction) private readonly conversationRestrictionRepository: Repository<ConversationRestriction>
    ) {}

    async getListOfDMs(user: User): Promise<Conversation[]>
    {
        let listOfDMs: Conversation[] = [];
        let conversationToUserList = await this.conversationToUserRepository.find({
            relations: {
                user: true,
                conversation: true
            },
            where: {
                user: {
                    id: user.id
                },
                conversation: {
                    groupConversation: false
                }
            }
        })
        for (let conversationToUser of conversationToUserList)
        {
            listOfDMs.push(conversationToUser.conversation);
        }
        return (listOfDMs);
    }

    async createConversation(newConversation : createConversationDto, creator: User): Promise<Conversation>
    {
        let users : User[] = [];
        if (newConversation.participants.length === 0)
            throw new BadRequestException("Unable to create conversation, missing participants list");
        if (newConversation.groupConversation === false && newConversation.participants.length !== 1)
            throw new BadRequestException("Direct messages cannot involve more than one two participants");
            if (newConversation.groupConversation === false && newConversation.password)
            throw new BadRequestException("Direct messages cannot be password protected");
        if (newConversation.groupConversation === true && !newConversation.name)
        {
            throw new BadRequestException("Please provide a name for your new group conversation");
        }
        for (const participant of newConversation.participants)
        {
            let currentUser = await this.userRepository.findOne({where: {
                id: participant,
            }})
            if (!currentUser)
            {
                throw new BadRequestException("Some participants do not exist");
            }
            if (currentUser.id === creator.id)
            {
                throw new BadRequestException("You cannot have a conversation with yourself");
            }
            users.push(currentUser);
        }
        if (!newConversation.groupConversation)
        {
            let creatorDMs = await this.getListOfDMs(creator);
            let recipientDMs = await this.getListOfDMs(users[0]);
            for (let creatorDM of creatorDMs)
            {
                if (recipientDMs.filter(el => el.id === creatorDM.id).length)
                    return (creatorDM);
            }
        }
        const createdConversation = this.conversationRepository.create(newConversation);
        if (!newConversation.groupConversation)
        {
            createdConversation.name = `${creator.name} - ${users[0].name}`;
        }
        if (createdConversation.password)
        {
            const salt = await bcrypt.genSalt();
            createdConversation.password =  await bcrypt.hash(createdConversation.password, salt);
        }
        await this.conversationRepository.save(createdConversation);
        if (newConversation.groupConversation === false)
        {
            let conversationToUser = this.conversationToUserRepository.create({lastRead: new Date(), role: conversationRole.ADMIN, user: users[0], conversation: createdConversation})
            await this.conversationToUserRepository.save(conversationToUser);
        }
        else
        {
            for (let currentUser of users)
            {
                let conversationToUser = this.conversationToUserRepository.create({lastRead: new Date(), role: conversationRole.USER, user: currentUser, conversation: createdConversation})
                await this.conversationToUserRepository.save(conversationToUser);
            } 
        }
        const conversationToUser = this.conversationToUserRepository.create({lastRead: new Date(), role: conversationRole.OWNER, user: creator, conversation: createdConversation})
        await this.conversationToUserRepository.save(conversationToUser);

        return (createdConversation);
    }

    async updateRole(conversationId: string, newRole: updateRoleDto, currentUser: User): Promise<boolean>
    {
        const conversation = await this.conversationRepository.findOne({
            relations:
            {
                conversationToUsers: true
            },
            where:
            {
                id : conversationId
            }});
        if (!conversation)
        {
            throw new NotFoundException("Conversation could not be found");
        }
        const currentUserRoles = conversation.conversationToUsers.filter(el => el.user.id === currentUser.id)
        if (currentUserRoles.length === 0)
            throw new ForbiddenException("You are not part of such a conversation");
        const currentUserRole = currentUserRoles[0];
        const targetUserRoles = conversation.conversationToUsers.filter(el => el.user.id === newRole.userId)
        if (targetUserRoles.length === 0)
            throw new ForbiddenException("The targeted user is not part of such a conversation");
        const targetUserRole = targetUserRoles[0];
        if (targetUserRole.id === currentUserRole.id)
        {
            if (!(newRole.newRole === conversationRole.USER && currentUserRole.role === conversationRole.ADMIN))
                throw new ForbiddenException("You are not allowed to change your role in this conversation")
            currentUserRole.role = conversationRole.USER;
            this.conversationToUserRepository.save(currentUserRole);
            return (true)
        }
        switch (currentUserRole.role)
        {
            case conversationRole.OWNER:
                if (newRole.newRole === conversationRole.OWNER)
                {
                    targetUserRole.role = conversationRole.OWNER
                    currentUserRole.role = conversationRole.ADMIN
                    this.conversationToUserRepository.save(currentUserRole);
                }
                else if (newRole.newRole === conversationRole.ADMIN)
                {
                    if (targetUserRole.role !== conversationRole.USER)
                        throw new ForbiddenException("This user is already an administrator of this conversation")
                    targetUserRole.role = conversationRole.ADMIN
                }
                else
                {
                    if (targetUserRole.role === conversationRole.USER)
                        throw new ForbiddenException("This user is already a regular user")
                    targetUserRole.role = conversationRole.USER;
                }
                break;
            case conversationRole.ADMIN:
                if (targetUserRole.role !== conversationRole.USER)
                    throw new ForbiddenException("You are not allowed to mofidy the role of this user");
                if (newRole.newRole !== conversationRole.ADMIN)
                    throw new ForbiddenException("You are not allowed to make this update")
                targetUserRole.role = conversationRole.ADMIN
                break;
            default:
                throw new ForbiddenException("You are not allowed to make changes in this conversation")
                break;
        }
        this.conversationToUserRepository.save(targetUserRole);
        return (true);
    }

    async getConversations(currentUser: User): Promise<Conversation[]>
    {
        let conversations : Conversation[] = [];
        const fullUser = await this.userRepository.findOne({
            relations: 
            {
                conversationToUsers: {
                    conversation: true
                }
            },
            where:
            {
                id: currentUser.id
            }
        })
        if (!fullUser)
        {
            throw new NotFoundException();
        }
        for (let conversationToUser of fullUser.conversationToUsers)
        {
            conversations.push(conversationToUser.conversation);
        }
        return (conversations);
    }

    async getMessages(currentUser: User, conversationId: string): Promise<Message[]>
    {
        const conversation = await this.conversationRepository.findOne({
            relations: 
            {
                conversationToUsers: true,
                messages:
                {
                    sender: true
                }
            },
            where:
            {
                id: conversationId,
                conversationToUsers : {
                    user: {
                        id : currentUser.id
                    }
                }
            }
        })
        if (!conversation)
        {
            throw new NotFoundException();
        }
        const userRole = conversation.conversationToUsers.filter(el => el.user.id === currentUser.id)[0]
        userRole.lastRead = new Date()
        this.conversationToUserRepository.save(userRole);
        return (conversation.messages);
    }


    async unreadCount(currentUser: User): Promise<unreadMessagesResponse>
    {
        let response : unreadMessagesResponse = {totalNumberOfUnreadMessages: 0, UnreadMessage: []}
        const conversationToUser = await this.conversationToUserRepository.find({
            relations:
            {
                conversation: true
            },
            where: {
                user:
                {
                    id: currentUser.id
                }
            }
        }
        )
        if (!conversationToUser.length)
        {
            return (response)
        }
        for (let role of conversationToUser)
        {
            const unreadMessages = await this.messageRepository.findAndCount({
                relations:
                {
                    conversation: true
                },
                where:
                {
                    created_at: MoreThan(role.lastRead),
                    conversation:
                    {
                        id : role.conversation.id
                    }
                }
            })
            if (unreadMessages[1])
            {
                response.totalNumberOfUnreadMessages += unreadMessages[1];
                response.UnreadMessage.push({conversationId: unreadMessages[0][0].conversation.id, name: unreadMessages[0][0].conversation.name, numberOfUnreadMessages: unreadMessages[1]})
            }
        }
        return (response);
    }

    async postMessage(currentUser: User, conversationId: string, content: string)
    {
        let conversation = await this.conversationRepository.findOne(
            {
                relations:
                {
                    conversationToUsers: true                    
                },
                where:
                {
                    id: conversationId,
                    conversationToUsers:
                    {
                        user:
                        {
                            id: currentUser.id
                        }
                    }
                }
            }
        )
        if (!conversation)
            return new NotFoundException()
        const newMessage = this.messageRepository.create({sender: currentUser, conversation: conversation, content: content});
        await this.messageRepository.save(newMessage);
        const userRole = conversation.conversationToUsers.filter(el => el.user.id === currentUser.id)[0]
        userRole.lastRead = new Date()
        this.conversationToUserRepository.save(userRole);
        return (true)
    }

    async joinConversation(currentUser: User, conversationId: string, password: string | null)
    {
        const conversation = await this.conversationRepository.findOne({
            relations:
            {
                conversationToUsers: true
            },
            where: {
                id: conversationId
            }
        });
        if (!conversation)
            throw new NotFoundException()
        const userRole = conversation.conversationToUsers.filter(el => el.user.id === currentUser.id)
        if (userRole.length)
            return (conversation)
        if (conversation.groupConversation === false)
            throw new ForbiddenException()
        if (conversation.password)
        {
            if (!password)
                throw new ForbiddenException("This conversation requires a password")
            else if (!(await bcrypt.compare(password, conversation.password)))
                throw new ForbiddenException();
        }
        const joined = this.conversationToUserRepository.create({role: conversationRole.USER, lastRead: new Date(), user: currentUser, conversation: conversation});
        this.conversationToUserRepository.save(joined);
        return (conversation)
    }

    async getConversationParticipants(currentUser: User, conversationId: string)
    {
        const conversation = await this.conversationRepository.findOne({
            relations:
            {
                conversationToUsers: true
            },
            where: {
                id: conversationId
            }
        });
        if (!conversation)
            throw new NotFoundException()
        const userRole = conversation.conversationToUsers.filter(el => el.user.id === currentUser.id)
        if (!userRole.length)
            throw new NotFoundException()
        return (conversation.conversationToUsers)
    }

    async leaveConversation(currentUser: User, conversationId: string)
    {
        const conversation = await this.conversationRepository.findOne({
            relations:
            {
                conversationToUsers:
                {
                    conversation: true
                }
            },
            where: {
                id: conversationId,
                conversationToUsers:
                {
                    user:
                    {
                        id: currentUser.id
                    }
                }
            }
        });
        if (!conversation)
            throw new NotFoundException();
        const userRole = conversation.conversationToUsers.filter((el) => el.user.id === currentUser.id)
        if (!userRole.length)
            throw new ForbiddenException()
        if (conversation.groupConversation === false)
            throw new ForbiddenException("Cannot leave direct message conversation")
        if (userRole[0].role === conversationRole.OWNER)
            throw new ForbiddenException("Please pick a new owner for this conversation before leaving it")
        return this.conversationToUserRepository.remove(userRole[0]);
    }

    async clearRestrictions(conversationId: string)
    {
        const time = new Date()
        const conversation = await this.conversationRepository.findOne(
            {
                relations:
                {
                    conversationToUsers: true,
                    conversationRestrictions: true
                },
                where:
                {
                    id: conversationId
                }
            }
        )
        if (!conversation)
            throw new NotFoundException()
        for (let conversationRestriction of conversation.conversationRestrictions)
        {
            if (conversationRestriction.until && conversationRestriction.until < time)
                await this.conversationRestrictionRepository.remove(conversationRestriction)
        }
    }

    async restrictUser(currentUser: User, conversationId: string, username: string, restrictionType: conversationRestrictionEnum, until: Date | null)
    {
        this.clearRestrictions(conversationId)
        if (until && until < new Date())
            throw new ForbiddenException("Time is in the past")
        if (!until && restrictionType === conversationRestrictionEnum.MUTE)
            throw new ForbiddenException("Muting users requires a time")
        const conversation = await this.conversationRepository.findOne(
            {
                relations:
                {
                    conversationToUsers: true,
                    conversationRestrictions: true
                },
                where:
                {
                    id: conversationId
                }
            }
        )
        if (!conversation)
            throw new NotFoundException()
        if (conversation.groupConversation === false)
            throw new ForbiddenException("Cannot restrict other party in a direct message conversation")
        const currentUserRole = conversation.conversationToUsers.filter( (el) => el.user.id === currentUser.id );
        if (!currentUserRole.length)
            throw new ForbiddenException("No such conversation found")
        const currentUserRestrictions = conversation.conversationRestrictions.filter( (el) => el.target.id === currentUser.id )
        if (currentUserRestrictions.length)
            throw new ForbiddenException("Cannot restrict other party while some restrictions are upon you")
        const targetUserRole = conversation.conversationToUsers.filter( (el) => el.user.name === username );
        if (!targetUserRole.length)
            throw new NotFoundException("Target user not found in this conversation")
        if (currentUserRole[0].role === conversationRole.USER || targetUserRole[0].role === conversationRole.OWNER
            || (targetUserRole[0].role === conversationRole.ADMIN && currentUserRole[0].role !== conversationRole.OWNER))
            throw new ForbiddenException("You do not hold such power")
        const targetUserRestrictions = conversation.conversationRestrictions.filter( (el) => el.target.name === username )
        if (targetUserRestrictions.length)
        {
            for (let restriction of targetUserRestrictions)
            {
                if (restriction.status === conversationRestrictionEnum.MUTE && restrictionType === conversationRestrictionEnum.MUTE)
                {
                    restriction.until = until;
                    this.conversationRestrictionRepository.save(restriction)
                    return `User muted until ${until}`
                }
                else if (restriction.status === conversationRestrictionEnum.BAN && restrictionType === conversationRestrictionEnum.BAN)
                {
                    restriction.until = until;
                    this.conversationRestrictionRepository.save(restriction)
                    return `User banned until ${until ? until : "the end of times"}`
                }
            }
        }
        let conversationRestriction = this.conversationRestrictionRepository.create({issuer: currentUser, target: targetUserRole[0].user, conversation: conversation, status: restrictionType, until: until})
        this.conversationRestrictionRepository.save(conversationRestriction)
        return `User ${restrictionType === conversationRestrictionEnum.BAN ? "banned" : "muted"} until ${until}`
    }
}
