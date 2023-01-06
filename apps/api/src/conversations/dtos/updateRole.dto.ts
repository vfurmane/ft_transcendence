import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { conversationRole } from "../conversationRole.enum";

export class updateRoleDto {
    @IsNotEmpty()
    @IsUUID()
    userId!: string;

    @IsNotEmpty()
    @IsEnum(conversationRole)
    newRole!: string
}