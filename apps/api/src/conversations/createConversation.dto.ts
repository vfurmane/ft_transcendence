import { IsBoolean, IsOptional, IsString } from "class-validator";

export class createConversationDto {
    @IsString()
    name!: string;

    @IsBoolean()
    public!: boolean;

    @IsOptional()
    @IsString()
    password!:string
}