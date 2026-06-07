import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import { UserRoleEnum } from '../../auth/types/UserRoleEnum';
import { StatusEnum } from '../../auth/types/StatusEnum';

const FIRST_NAMES = [
  'James',
  'Mary',
  'Robert',
  'Patricia',
  'John',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'William',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Lisa',
  'Daniel',
  'Nancy',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
  'Steven',
  'Dorothy',
  'Paul',
  'Kimberly',
  'Andrew',
  'Emily',
  'Joshua',
  'Donna',
  'Kenneth',
  'Michelle',
  'Kevin',
  'Carol',
  'Brian',
  'Amanda',
  'George',
  'Melissa',
  'Timothy',
  'Deborah',
  'Ronald',
  'Stephanie',
  'Edward',
  'Rebecca',
  'Jason',
  'Sharon',
  'Jeffrey',
  'Laura',
  'Ryan',
  'Cynthia',
  'Jacob',
  'Kathleen',
  'Gary',
  'Amy',
  'Nicholas',
  'Angela',
  'Eric',
  'Shirley',
  'Jonathan',
  'Anna',
  'Stephen',
  'Brenda',
  'Larry',
  'Pamela',
  'Justin',
  'Emma',
  'Scott',
  'Nicole',
  'Brandon',
  'Helen',
  'Benjamin',
  'Samantha',
  'Samuel',
  'Katherine',
  'Raymond',
  'Christine',
  'Gregory',
  'Debra',
  'Frank',
  'Rachel',
  'Alexander',
  'Carolyn',
  'Patrick',
  'Janet',
  'Jack',
  'Catherine',
  'Dennis',
  'Maria',
  'Jerry',
  'Heather',
  'Tyler',
  'Diane',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Gomez',
  'Phillips',
  'Evans',
  'Turner',
  'Diaz',
  'Parker',
  'Cruz',
  'Edwards',
  'Collins',
  'Reyes',
  'Stewart',
  'Morris',
  'Morales',
  'Murphy',
  'Cook',
  'Rogers',
  'Gutierrez',
  'Ortiz',
  'Morgan',
  'Cooper',
  'Peterson',
  'Bailey',
  'Reed',
  'Kelly',
  'Howard',
  'Ramos',
  'Kim',
  'Cox',
  'Ward',
  'Richardson',
  'Watson',
  'Brooks',
  'Chavez',
  'Wood',
  'James',
  'Bennett',
  'Gray',
  'Mendoza',
  'Ruiz',
  'Hughes',
  'Price',
  'Alvarez',
  'Castillo',
  'Sanders',
  'Patel',
  'Myers',
  'Long',
  'Ross',
  'Foster',
  'Jimenez',
  'Powell',
  'Jenkins',
  'Perry',
  'Russell',
];

const DOMAINS = ['example.com', 'test.com', 'mail.com'];

function generateUsers(): Partial<User>[] {
  const users: Partial<User>[] = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      role: UserRoleEnum.ADMIN,
      status: StatusEnum.ACTIVE,
      isEmailVerified: true,
      isPremium: false,
    },
    {
      email: 'user@example.com',
      name: 'John Doe',
      role: UserRoleEnum.USER,
      status: StatusEnum.ACTIVE,
      isEmailVerified: true,
      isPremium: false,
    },
    {
      email: 'premium@example.com',
      name: 'Jane Premium',
      role: UserRoleEnum.USER,
      status: StatusEnum.ACTIVE,
      isEmailVerified: true,
      isPremium: true,
    },
  ];

  const usedEmails = new Set(users.map((u) => u.email));

  for (let i = 0; i < 57; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const last = LAST_NAMES[i % LAST_NAMES.length]!;
    const domain = DOMAINS[i % DOMAINS.length]!;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@${domain}`;

    if (usedEmails.has(email)) continue;
    usedEmails.add(email);

    const isAdmin = i % 30 === 0;
    const isPremium = i % 5 === 0;
    const statusRoll = i % 10;
    const status =
      statusRoll === 0
        ? StatusEnum.INACTIVE
        : statusRoll === 1
          ? StatusEnum.BANNED
          : StatusEnum.ACTIVE;

    users.push({
      email,
      name: `${first} ${last}`,
      role: isAdmin ? UserRoleEnum.ADMIN : UserRoleEnum.USER,
      status,
      isEmailVerified: i % 3 !== 0,
      isPremium,
    });
  }

  return users;
}

const USERS_DATA = generateUsers();

export async function seedUsers(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n👤 Seeding users...');

  const userRepo = dataSource.getRepository(User);

  const existingUsers = await userRepo.find({ select: ['id', 'email'] });
  const existingEmails = new Set(existingUsers.map((u) => u.email));

  let inserted = 0;
  let skipped = 0;

  for (const userData of USERS_DATA) {
    if (existingEmails.has(userData.email!)) {
      skipped++;
      continue;
    }

    const user = userRepo.create(userData);
    await userRepo.save(user);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Users seeded successfully\n');

  return { inserted, skipped };
}
