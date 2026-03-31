import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateIncidentDto {
  @IsInt()
  @Min(1)
  houseId!: number;

  @IsDateString()
  incidentDate!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
