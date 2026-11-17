import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CreateQuizSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  timePerQuestionSeconds?: number;

  @IsOptional()
  @IsBoolean()
  speedBonusEnabled?: boolean;
}

export class CreateQuizDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  questionIds!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateQuizSettingsDto)
  settings?: CreateQuizSettingsDto;
}
