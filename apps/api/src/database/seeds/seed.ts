import * as argon2 from 'argon2';
import { AppDataSource } from '../data-source';
import { UserEntity } from '../entities/user.entity';
import { MessEntity } from '../entities/mess.entity';
import { MembershipEntity } from '../entities/membership.entity';
import { MealDefaultEntity } from '../entities/meal-default.entity';
import { LedgerEntryEntity } from '../entities/ledger-entry.entity';
import { NoticeEntity } from '../entities/notice.entity';
import {
  MembershipRole,
  MealType,
  EggPreference,
  LedgerType,
  getDhakaDateString
} from '@mess/shared';

/**
 * Local development seed script creating a sample Bangladesh mess with
 * manager, boarders, meal defaults, deposits, and announcements.
 */
async function runSeed() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(UserEntity);
  const messRepo = AppDataSource.getRepository(MessEntity);
  const membershipRepo = AppDataSource.getRepository(MembershipEntity);
  const mealDefaultRepo = AppDataSource.getRepository(MealDefaultEntity);
  const ledgerRepo = AppDataSource.getRepository(LedgerEntryEntity);
  const noticeRepo = AppDataSource.getRepository(NoticeEntity);

  const passwordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id
  });

  // 1. Seed Users
  const managerUser = await userRepo.save(
    userRepo.create({
      name: 'তানভীর আহমেদ (Tanvir)',
      phone: '01711223344',
      passwordHash
    })
  );

  const boarder1 = await userRepo.save(
    userRepo.create({
      name: 'রফিকুল ইসলাম (Rafiq)',
      phone: '01722334455',
      passwordHash
    })
  );

  const boarder2 = await userRepo.save(
    userRepo.create({
      name: 'শাকিল হোসেন (Shakil)',
      phone: '01733445566',
      passwordHash
    })
  );

  // 2. Seed Mess
  const mess = await messRepo.save(
    messRepo.create({
      name: 'উত্তরা মেস (Uttara Mess)',
      cutoffTime: '22:00:00',
      mealRate: '50.0000',
      graceDays: 3,
      warningDays: 2,
      shoppersPerDay: 2,
      shopTimesPerMonth: 2
    })
  );

  const today = getDhakaDateString();

  // 3. Seed Memberships & Defaults
  const allUsers = [
    { user: managerUser, role: MembershipRole.MANAGER, deposit: '3000.0000' },
    { user: boarder1, role: MembershipRole.BOARDER, deposit: '2500.0000' },
    { user: boarder2, role: MembershipRole.BOARDER, deposit: '1500.0000' }
  ];

  for (const item of allUsers) {
    const membership = await membershipRepo.save(
      membershipRepo.create({
        userId: item.user.id,
        messId: mess.id,
        role: item.role,
        isActive: true,
        cookBillAmount: '250.0000'
      })
    );

    await mealDefaultRepo.save(
      mealDefaultRepo.create({
        membershipId: membership.id,
        mealType: MealType.FULL,
        halfSlot: null,
        eggPreference: EggPreference.NONE,
        effectiveFrom: today
      })
    );

    await ledgerRepo.save(
      ledgerRepo.create({
        membershipId: membership.id,
        type: LedgerType.DEPOSIT,
        amount: item.deposit,
        date: today,
        note: 'Initial monthly deposit',
        createdBy: managerUser.id
      })
    );
  }

  // 4. Seed Notice
  await noticeRepo.save(
    noticeRepo.create({
      messId: mess.id,
      authorId: managerUser.id,
      title: 'মাসের বাজার ও মিল কাটঅফ নিয়মাবলী',
      body: 'রাত ১০টার পর পরবর্তী দিনের মিল লক হয়ে যাবে। অনুগ্রহ করে সময়মতো মিলের পরিবর্তন সম্পন্ন করুন।'
    })
  );

  await AppDataSource.destroy();
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
