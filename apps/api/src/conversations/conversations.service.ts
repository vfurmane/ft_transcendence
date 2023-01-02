import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { conversationRole } from './conversationRole.enum';
import { ConversationToUser } from './conversationToUser.entity';
import { createConversationDto } from './dtos/createConversation.dto';
import { updateRoleDto } from './dtos/updateRole.dto';

@Injectable()
export class ConversationsService {
    constructor(
        @InjectRepository(Conversation) private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(ConversationToUser) private readonly conversationToUserRepository: Repository<ConversationToUser>,
        @InjectRepository(User) private readonly userRepository: Repository<User>
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
                {
                    console.error("Conversation already exists");
                    return (creatorDM);
                }
            }
        }
        const createdConversation = this.conversationRepository.create(newConversation);
        if (!newConversation.groupConversation)
        {
            createdConversation.name = `${creator.name} - ${users[0].name}`;
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

    async updateRole(newRole: updateRoleDto, currentUser: User): Promise<boolean>
    {
        const conversation = await this.conversationRepository.findOne({
            relations:
            {
                conversationToUsers: true
            },
            where:
            {
                id : newRole.conversationId
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
}
