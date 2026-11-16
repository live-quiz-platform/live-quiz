import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { QuizBankModule } from './quiz-bank/quiz-bank.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    UsersModule,
    QuizBankModule,
  ],
})
export class AppModule {}
