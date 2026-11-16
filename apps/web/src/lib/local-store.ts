import {
  UserDto,
  AuthResponseDto,
  MessDto,
  MembershipDto,
  MembershipRole,
  MealType,
  SlotType,
  EggPreference,
  ProteinType,
  LedgerType,
  RosterSource,
  ExpenseStatus,
  BalanceStatus,
  ShopperDailySummaryDto,
  ShoppingRosterDto,
  ShoppingExpenseDto,
  LedgerEntryDto,
  NoticeDto,
  AuditLogDto,
  MonthStatementDto,
  getDhakaDateString
} from '@mess/shared';

interface StoredMealOverride {
  membershipId: string;
  date: string;
  slot: SlotType;
  status: boolean;
  eggPreference: EggPreference;
  guestCount: number;
}

interface StoredMealToggle {
  membershipId: string;
  status: boolean;
  fromDate: string;
}

interface StoredMealDefault {
  membershipId: string;
  mealType: MealType;
  halfSlot: SlotType | null;
  eggPreference: EggPreference;
}

interface StoredMenu {
  id: string;
  messId: string;
  date: string;
  shopperId: string | null;
  protein: ProteinType;
  note: string | null;
}

interface LocalDatabase {
  users: UserDto[];
  messes: MessDto[];
  memberships: MembershipDto[];
  mealDefaults: StoredMealDefault[];
  mealToggles: StoredMealToggle[];
  mealOverrides: StoredMealOverride[];
  menus: StoredMenu[];
  roster: ShoppingRosterDto[];
  expenses: ShoppingExpenseDto[];
  ledger: LedgerEntryDto[];
  notices: NoticeDto[];
  auditLogs: AuditLogDto[];
  closedMonths: Record<string, string>;
}

const DB_STORAGE_KEY = 'mess_manager_db_v1';
const SESSION_STORAGE_KEY = 'mess_manager_session_v1';

/**
 * Converts Bengali digits in phone numbers to standard ASCII digits.
 */
function normalizePhone(input: string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let result = input.trim();
  bengaliDigits.forEach((bn, idx) => {
    result = result.split(bn).join(String(idx));
  });
  return result.replace(/[\s-]/g, '');
}

/**
 * Creates initial seeded database for browser persistence.
 */
function createSeedDatabase(): LocalDatabase {
  const today = getDhakaDateString();
  const currentMonth = today.slice(0, 7);
  const nowIso = new Date().toISOString();

  const users: UserDto[] = [
    {
      id: 'usr-manager-1',
      name: 'তানভীর আহমেদ (Tanvir)',
      phone: '01711223344',
      avatarUrl: null,
      createdAt: nowIso
    },
    {
      id: 'usr-boarder-1',
      name: 'রফিকুল ইসলাম (Rafiq)',
      phone: '01722334455',
      avatarUrl: null,
      createdAt: nowIso
    },
    {
      id: 'usr-boarder-2',
      name: 'শাকিল হোসেন (Shakil)',
      phone: '01733445566',
      avatarUrl: null,
      createdAt: nowIso
    }
  ];

  const mess: MessDto = {
    id: 'mess-uttara-1',
    name: 'উত্তরা মেস (Uttara Mess)',
    cutoffTime: '22:00:00',
    mealRate: '50.00',
    graceDays: 3,
    warningDays: 2,
    shoppersPerDay: 2,
    shopTimesPerMonth: 2,
    createdAt: nowIso
  };

  const memberships: MembershipDto[] = [
    {
      id: 'mem-manager-1',
      userId: 'usr-manager-1',
      messId: mess.id,
      role: MembershipRole.MANAGER,
      isActive: true,
      cookBillAmount: '250.00',
      user: users[0],
      mess,
      joinedAt: nowIso
    },
    {
      id: 'mem-boarder-1',
      userId: 'usr-boarder-1',
      messId: mess.id,
      role: MembershipRole.BOARDER,
      isActive: true,
      cookBillAmount: '250.00',
      user: users[1],
      mess,
      joinedAt: nowIso
    },
    {
      id: 'mem-boarder-2',
      userId: 'usr-boarder-2',
      messId: mess.id,
      role: MembershipRole.BOARDER,
      isActive: true,
      cookBillAmount: '250.00',
      user: users[2],
      mess,
      joinedAt: nowIso
    }
  ];

  const mealDefaults: StoredMealDefault[] = memberships.map((m) => ({
    membershipId: m.id,
    mealType: MealType.FULL,
    halfSlot: null,
    eggPreference: EggPreference.NONE
  }));

  const ledger: LedgerEntryDto[] = [
    {
      id: 'led-1',
      membershipId: 'mem-manager-1',
      type: LedgerType.DEPOSIT,
      amount: '3000.00',
      date: `${currentMonth}-01`,
      referenceId: null,
      note: 'Initial monthly deposit',
      createdBy: 'usr-manager-1',
      createdAt: nowIso
    },
    {
      id: 'led-2',
      membershipId: 'mem-boarder-1',
      type: LedgerType.DEPOSIT,
      amount: '2500.00',
      date: `${currentMonth}-01`,
      referenceId: null,
      note: 'Initial monthly deposit',
      createdBy: 'usr-manager-1',
      createdAt: nowIso
    },
    {
      id: 'led-3',
      membershipId: 'mem-boarder-2',
      type: LedgerType.DEPOSIT,
      amount: '1800.00',
      date: `${currentMonth}-01`,
      referenceId: null,
      note: 'Initial monthly deposit',
      createdBy: 'usr-manager-1',
      createdAt: nowIso
    }
  ];

  const expenses: ShoppingExpenseDto[] = [
    {
      id: 'exp-1',
      messId: mess.id,
      date: today,
      shopperId: 'mem-boarder-1',
      total: '1450.00',
      status: ExpenseStatus.APPROVED,
      receiptUrl: null,
      shopper: memberships[1],
      items: [
        {
          id: 'item-1',
          expenseId: 'exp-1',
          name: 'রুই মাছ (Rui Fish)',
          quantity: '2.5 kg',
          price: '850.00'
        },
        {
          id: 'item-2',
          expenseId: 'exp-1',
          name: 'ডিম (Eggs)',
          quantity: '24 pcs',
          price: '360.00'
        },
        {
          id: 'item-3',
          expenseId: 'exp-1',
          name: 'সবজি ও মশলা (Vegetables)',
          quantity: '1 lot',
          price: '240.00'
        }
      ]
    }
  ];

  const roster: ShoppingRosterDto[] = [
    {
      id: 'ros-1',
      messId: mess.id,
      date: today,
      membershipId: 'mem-boarder-1',
      source: RosterSource.VOTE,
      member: memberships[1]
    },
    {
      id: 'ros-2',
      messId: mess.id,
      date: `${currentMonth}-18`,
      membershipId: 'mem-boarder-2',
      source: RosterSource.VOTE,
      member: memberships[2]
    }
  ];

  const notices: NoticeDto[] = [
    {
      id: 'not-1',
      messId: mess.id,
      authorId: 'usr-manager-1',
      authorName: users[0]?.name,
      title: 'মাসের বাজার ও মিল কাটঅফ নিয়মাবলী',
      body: 'রাত ১০টার পর পরবর্তী দিনের মিল লক হয়ে যাবে। অনুগ্রহ করে সময়মতো মিলের পরিবর্তন সম্পন্ন করুন।',
      createdAt: nowIso
    }
  ];

  const auditLogs: AuditLogDto[] = [
    {
      id: 'aud-1',
      messId: mess.id,
      actorId: 'usr-manager-1',
      action: 'DEPOSIT_RECORDED',
      entity: 'ledger_entries',
      before: null,
      after: { membershipId: 'mem-boarder-1', amount: '2500.00' },
      reason: 'Initial monthly deposit recorded by manager',
      createdAt: nowIso
    }
  ];

  return {
    users,
    messes: [mess],
    memberships,
    mealDefaults,
    mealToggles: [],
    mealOverrides: [],
    menus: [
      {
        id: 'menu-1',
        messId: mess.id,
        date: today,
        shopperId: 'mem-boarder-1',
        protein: ProteinType.FISH,
        note: 'রুই মাছ ও ডাল (Rui Fish & Dal)'
      }
    ],
    roster,
    expenses,
    ledger,
    notices,
    auditLogs,
    closedMonths: {}
  };
}

function loadDb(): LocalDatabase {
  if (typeof window === 'undefined') {
    return createSeedDatabase();
  }
  const raw = window.localStorage.getItem(DB_STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedDatabase();
    window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw) as LocalDatabase;
  } catch {
    const seeded = createSeedDatabase();
    window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveDb(db: LocalDatabase): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  }
}

function getSessionUser(db: LocalDatabase): UserDto | null {
  if (typeof window === 'undefined') return null;
  const userId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function setSessionUser(userId: string | null): void {
  if (typeof window === 'undefined') return;
  if (userId) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, userId);
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

/**
 * Resolves whether a member's slot is active on a given date.
 */
function resolveSlotStatus(
  db: LocalDatabase,
  membershipId: string,
  date: string,
  slot: SlotType
): { status: boolean; isAutoOff: boolean; guestCount: number; eggPreference: EggPreference } {
  const override = db.mealOverrides.find(
    (o) => o.membershipId === membershipId && o.date === date && o.slot === slot
  );
  if (override) {
    return {
      status: override.status,
      isAutoOff: false,
      guestCount: override.guestCount,
      eggPreference: override.eggPreference
    };
  }

  const toggle = db.mealToggles.find((t) => t.membershipId === membershipId && t.fromDate <= date);
  if (toggle) {
    return {
      status: toggle.status,
      isAutoOff: false,
      guestCount: 0,
      eggPreference: EggPreference.NONE
    };
  }

  const def = db.mealDefaults.find((d) => d.membershipId === membershipId);
  if (def && def.mealType === MealType.HALF) {
    return {
      status: def.halfSlot === slot,
      isAutoOff: false,
      guestCount: 0,
      eggPreference: def.eggPreference
    };
  }

  return {
    status: true,
    isAutoOff: false,
    guestCount: 0,
    eggPreference: def?.eggPreference || EggPreference.NONE
  };
}

/**
 * Handles API requests locally with full browser persistence when no external backend is reachable.
 */
export async function handleLocalApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const db = loadDb();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};

  const urlObj = new URL(endpoint, 'http://localhost');
  const path = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // 1. AUTH ENDPOINTS
  if (path === '/auth/register' && method === 'POST') {
    const cleanPhone = normalizePhone(String(body.phone || ''));
    let user = db.users.find((u) => normalizePhone(u.phone) === cleanPhone);
    const nowIso = new Date().toISOString();

    if (!user) {
      user = {
        id: `usr-${Date.now()}`,
        name: String(body.name || 'Mess Member').trim(),
        phone: cleanPhone,
        avatarUrl: null,
        createdAt: nowIso
      };
      db.users.push(user);
    }

    const defaultMess = db.messes[0];
    if (defaultMess) {
      const existingMem = db.memberships.find(
        (m) => m.userId === user!.id && m.messId === defaultMess.id
      );
      if (!existingMem) {
        const newMem: MembershipDto = {
          id: `mem-${Date.now()}`,
          userId: user.id,
          messId: defaultMess.id,
          role: MembershipRole.MANAGER,
          isActive: true,
          cookBillAmount: '250.00',
          user,
          mess: defaultMess,
          joinedAt: nowIso
        };
        db.memberships.push(newMem);
        db.mealDefaults.push({
          membershipId: newMem.id,
          mealType: MealType.FULL,
          halfSlot: null,
          eggPreference: EggPreference.NONE
        });
        db.ledger.push({
          id: `led-${Date.now()}`,
          membershipId: newMem.id,
          type: LedgerType.DEPOSIT,
          amount: '3000.00',
          date: getDhakaDateString(),
          referenceId: null,
          note: 'Initial welcome deposit',
          createdBy: user.id,
          createdAt: nowIso
        });
      }
    }

    saveDb(db);
    setSessionUser(user.id);

    const response: AuthResponseDto = {
      user,
      accessToken: `local-jwt-${user.id}`,
      activeMessId: db.messes[0]?.id
    };
    return response as unknown as T;
  }

  if (path === '/auth/login' && method === 'POST') {
    const cleanPhone = normalizePhone(String(body.phone || ''));
    let user = db.users.find((u) => normalizePhone(u.phone) === cleanPhone);
    const nowIso = new Date().toISOString();

    if (!user) {
      user = {
        id: `usr-${Date.now()}`,
        name: `সদস্য (${cleanPhone.slice(-4)})`,
        phone: cleanPhone,
        avatarUrl: null,
        createdAt: nowIso
      };
      db.users.push(user);

      const defaultMess = db.messes[0];
      if (defaultMess) {
        const newMem: MembershipDto = {
          id: `mem-${Date.now()}`,
          userId: user.id,
          messId: defaultMess.id,
          role: MembershipRole.MANAGER,
          isActive: true,
          cookBillAmount: '250.00',
          user,
          mess: defaultMess,
          joinedAt: nowIso
        };
        db.memberships.push(newMem);
        db.ledger.push({
          id: `led-${Date.now()}`,
          membershipId: newMem.id,
          type: LedgerType.DEPOSIT,
          amount: '2500.00',
          date: getDhakaDateString(),
          referenceId: null,
          note: 'Initial deposit',
          createdBy: user.id,
          createdAt: nowIso
        });
      }
      saveDb(db);
    }

    setSessionUser(user.id);
    const userMess = db.memberships.find((m) => m.userId === user!.id);
    const response: AuthResponseDto = {
      user,
      accessToken: `local-jwt-${user.id}`,
      activeMessId: userMess?.messId || db.messes[0]?.id
    };
    return response as unknown as T;
  }

  if (path === '/auth/refresh' && method === 'POST') {
    const user = getSessionUser(db);
    if (!user) {
      throw new Error('No active session');
    }
    const userMess = db.memberships.find((m) => m.userId === user.id);
    const response: AuthResponseDto = {
      user,
      accessToken: `local-jwt-${user.id}`,
      activeMessId: userMess?.messId || db.messes[0]?.id
    };
    return response as unknown as T;
  }

  if (path === '/auth/logout' && method === 'POST') {
    setSessionUser(null);
    return { success: true } as unknown as T;
  }

  // 2. MESSES ENDPOINTS
  if (path === '/messes/my' && method === 'GET') {
    const user = getSessionUser(db) || db.users[0];
    if (!user) return [] as unknown as T;
    const myMessIds = new Set(
      db.memberships.filter((m) => m.userId === user.id).map((m) => m.messId)
    );
    const list = db.messes.filter((m) => myMessIds.has(m.id));
    return (list.length > 0 ? list : db.messes) as unknown as T;
  }

  if (path === '/messes' && method === 'POST') {
    const user = getSessionUser(db) || db.users[0]!;
    const nowIso = new Date().toISOString();
    const newMess: MessDto = {
      id: `mess-${Date.now()}`,
      name: String(body.name || 'New Mess'),
      cutoffTime: String(body.cutoffTime || '22:00:00'),
      mealRate: Number(body.mealRate || 50).toFixed(2),
      graceDays: Number(body.graceDays ?? 3),
      warningDays: Number(body.warningDays ?? 2),
      shoppersPerDay: Number(body.shoppersPerDay ?? 2),
      shopTimesPerMonth: Number(body.shopTimesPerMonth ?? 2),
      createdAt: nowIso
    };
    db.messes.push(newMess);

    const newMem: MembershipDto = {
      id: `mem-${Date.now()}`,
      userId: user.id,
      messId: newMess.id,
      role: MembershipRole.MANAGER,
      isActive: true,
      cookBillAmount: '250.00',
      user,
      mess: newMess,
      joinedAt: nowIso
    };
    db.memberships.push(newMem);
    db.ledger.push({
      id: `led-${Date.now()}`,
      membershipId: newMem.id,
      type: LedgerType.DEPOSIT,
      amount: '3000.00',
      date: getDhakaDateString(),
      referenceId: null,
      note: 'Opening deposit',
      createdBy: user.id,
      createdAt: nowIso
    });
    saveDb(db);
    return newMess as unknown as T;
  }

  const messUpdateMatch = path.match(/^\/messes\/([^/]+)$/);
  if (messUpdateMatch && method === 'PATCH') {
    const targetMessId = messUpdateMatch[1]!;
    const targetMess = db.messes.find((m) => m.id === targetMessId);
    const currentUser = getSessionUser(db) || db.users[0]!;
    if (targetMess) {
      const before = { ...targetMess };
      if (body.name !== undefined) targetMess.name = String(body.name);
      if (body.cutoffTime !== undefined) targetMess.cutoffTime = String(body.cutoffTime);
      if (body.mealRate !== undefined) targetMess.mealRate = Number(body.mealRate).toFixed(2);
      if (body.graceDays !== undefined) targetMess.graceDays = Number(body.graceDays);
      if (body.warningDays !== undefined) targetMess.warningDays = Number(body.warningDays);
      if (body.shoppersPerDay !== undefined) {
        targetMess.shoppersPerDay = Number(body.shoppersPerDay);
      }
      if (body.shopTimesPerMonth !== undefined) {
        targetMess.shopTimesPerMonth = Number(body.shopTimesPerMonth);
      }
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        messId: targetMess.id,
        actorId: currentUser.id,
        action: 'MESS_SETTINGS_UPDATED',
        entity: 'messes',
        before: { mealRate: before.mealRate, cutoffTime: before.cutoffTime },
        after: { mealRate: targetMess.mealRate, cutoffTime: targetMess.cutoffTime },
        reason: 'Admin updated mess configuration settings',
        createdAt: new Date().toISOString()
      });
      saveDb(db);
    }
    return targetMess as unknown as T;
  }

  // Match /messes/:messId/...
  const messMatch = path.match(/^\/messes\/([^/]+)\/(.+)$/);
  if (messMatch) {
    const messId = messMatch[1]!;
    const subPath = messMatch[2]!;
    const mess = db.messes.find((m) => m.id === messId) || db.messes[0]!;
    const currentUser = getSessionUser(db) || db.users[0]!;
    const currentMem =
      db.memberships.find((m) => m.messId === mess.id && m.userId === currentUser.id) ||
      db.memberships.find((m) => m.messId === mess.id)!;

    // MEMBERS
    if (subPath === 'members' && method === 'GET') {
      const activeOnly = searchParams.get('activeOnly') !== 'false';
      const members = db.memberships
        .filter((m) => m.messId === mess.id && (!activeOnly || m.isActive))
        .map((m) => ({
          ...m,
          user: db.users.find((u) => u.id === m.userId) || m.user
        }));
      return members as unknown as T;
    }

    if (subPath === 'members' && method === 'POST') {
      const cleanPhone = normalizePhone(String(body.phone || ''));
      const nowIso = new Date().toISOString();
      let user = db.users.find((u) => normalizePhone(u.phone) === cleanPhone);
      if (!user) {
        user = {
          id: `usr-${Date.now()}`,
          name: String(body.name || `বর্ডার (${cleanPhone.slice(-4)})`),
          phone: cleanPhone,
          avatarUrl: null,
          createdAt: nowIso
        };
        db.users.push(user);
      }
      const newMem: MembershipDto = {
        id: `mem-${Date.now()}`,
        userId: user.id,
        messId: mess.id,
        role: (body.role as MembershipRole) || MembershipRole.BOARDER,
        isActive: true,
        cookBillAmount: Number(body.cookBillAmount || 250).toFixed(2),
        user,
        mess,
        joinedAt: nowIso
      };
      db.memberships.push(newMem);
      db.ledger.push({
        id: `led-${Date.now()}`,
        membershipId: newMem.id,
        type: LedgerType.DEPOSIT,
        amount: '2000.00',
        date: getDhakaDateString(),
        referenceId: null,
        note: 'Initial deposit',
        createdBy: currentUser.id,
        createdAt: nowIso
      });
      saveDb(db);
      return newMem as unknown as T;
    }

    const memPatchMatch = subPath.match(/^members\/([^/]+)$/);
    if (memPatchMatch && method === 'PATCH') {
      const targetId = memPatchMatch[1]!;
      const target = db.memberships.find((m) => m.id === targetId);
      if (target) {
        const before = {
          role: target.role,
          isActive: target.isActive,
          cookBillAmount: target.cookBillAmount
        };
        if (body.isActive !== undefined) target.isActive = Boolean(body.isActive);
        if (body.role !== undefined) target.role = body.role as MembershipRole;
        if (body.cookBillAmount !== undefined) {
          target.cookBillAmount = Number(body.cookBillAmount).toFixed(2);
        }
        db.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          messId: mess.id,
          actorId: currentUser.id,
          action: 'MEMBER_UPDATED',
          entity: 'memberships',
          before,
          after: {
            role: target.role,
            isActive: target.isActive,
            cookBillAmount: target.cookBillAmount
          },
          reason: body.reason ? String(body.reason) : 'Admin updated member settings',
          createdAt: new Date().toISOString()
        });
        saveDb(db);
      }
      return target as unknown as T;
    }

    if (memPatchMatch && method === 'DELETE') {
      const targetId = memPatchMatch[1]!;
      const idx = db.memberships.findIndex((m) => m.id === targetId);
      if (idx >= 0) {
        const removed = db.memberships[idx]!;
        db.memberships.splice(idx, 1);
        db.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          messId: mess.id,
          actorId: currentUser.id,
          action: 'MEMBER_REMOVED',
          entity: 'memberships',
          before: { membershipId: removed.id, userId: removed.userId },
          after: null,
          reason: 'Admin removed member from mess',
          createdAt: new Date().toISOString()
        });
        saveDb(db);
      }
      return { success: true } as unknown as T;
    }

    // MEALS HEATMAP
    if (subPath === 'meals/heatmap' && method === 'GET') {
      const month = searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const [yearStr, monthStr] = month.split('-');
      const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate() || 30;
      const members = db.memberships.filter((m) => m.messId === mess.id && m.isActive);

      const rows = members.map((m) => {
        const user = db.users.find((u) => u.id === m.userId) || m.user;
        const cells = [];
        let totalMeals = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${month}-${String(d).padStart(2, '0')}`;
          const lunch = resolveSlotStatus(db, m.id, dateStr, SlotType.LUNCH);
          const dinner = resolveSlotStatus(db, m.id, dateStr, SlotType.DINNER);

          if (lunch.status) totalMeals += 0.5 + lunch.guestCount * 0.5;
          if (dinner.status) totalMeals += 0.5 + dinner.guestCount * 0.5;

          cells.push({
            date: dateStr,
            lunch: {
              status: lunch.status,
              isAutoOff: lunch.isAutoOff,
              guestCount: lunch.guestCount
            },
            dinner: {
              status: dinner.status,
              isAutoOff: dinner.isAutoOff,
              guestCount: dinner.guestCount
            }
          });
        }

        return {
          membershipId: m.id,
          userName: user?.name || 'Member',
          avatarUrl: user?.avatarUrl || null,
          cells,
          totalMeals
        };
      });

      return { month, daysInMonth, rows } as unknown as T;
    }

    // SHOPPER SUMMARY
    if (subPath === 'meals/shopper-summary' && method === 'GET') {
      const date = searchParams.get('date') || getDhakaDateString();
      const members = db.memberships.filter((m) => m.messId === mess.id && m.isActive);
      const menu = db.menus.find((mn) => mn.messId === mess.id && mn.date === date);

      let lunchMeals = 0;
      let dinnerMeals = 0;
      let guestMeals = 0;
      let eggTotal = 0;

      for (const m of members) {
        const l = resolveSlotStatus(db, m.id, date, SlotType.LUNCH);
        const dn = resolveSlotStatus(db, m.id, date, SlotType.DINNER);
        if (l.status) {
          lunchMeals += 1 + l.guestCount;
          guestMeals += l.guestCount;
          if (l.eggPreference !== EggPreference.NONE) eggTotal += 1;
        }
        if (dn.status) {
          dinnerMeals += 1 + dn.guestCount;
          guestMeals += dn.guestCount;
          if (dn.eggPreference !== EggPreference.NONE) eggTotal += 1;
        }
      }

      const totalMeals = (lunchMeals + dinnerMeals) * 0.5;
      const summary: ShopperDailySummaryDto = {
        date,
        messId: mess.id,
        lunchMeals,
        dinnerMeals,
        totalMealUnits: totalMeals,
        eggCount: eggTotal,
        guestCount: guestMeals,
        estimatedBudget: (totalMeals * Number(mess.mealRate)).toFixed(2),
        menu: menu || {
          id: 'menu-default',
          messId: mess.id,
          date,
          shopperId: null,
          protein: ProteinType.FISH,
          note: 'রুই মাছ ও ডাল (Rui Fish & Dal)'
        }
      };
      return summary as unknown as T;
    }

    // MEAL PREFERENCES
    if (subPath === 'meals/toggle' && method === 'POST') {
      const existing = db.mealToggles.find((t) => t.membershipId === currentMem.id);
      if (existing) {
        existing.status = Boolean(body.status);
        existing.fromDate = String(body.fromDate || getDhakaDateString());
      } else {
        db.mealToggles.push({
          membershipId: currentMem.id,
          status: Boolean(body.status),
          fromDate: String(body.fromDate || getDhakaDateString())
        });
      }
      saveDb(db);
      return { success: true } as unknown as T;
    }

    if (subPath === 'meals/default' && method === 'POST') {
      const existing = db.mealDefaults.find((d) => d.membershipId === currentMem.id);
      if (existing) {
        existing.mealType = body.mealType || MealType.FULL;
        existing.halfSlot = body.halfSlot || null;
        existing.eggPreference = body.eggPreference || EggPreference.NONE;
      } else {
        db.mealDefaults.push({
          membershipId: currentMem.id,
          mealType: body.mealType || MealType.FULL,
          halfSlot: body.halfSlot || null,
          eggPreference: body.eggPreference || EggPreference.NONE
        });
      }
      saveDb(db);
      return { success: true } as unknown as T;
    }

    if (subPath === 'meals/override' && method === 'POST') {
      const date = String(body.date || getDhakaDateString());
      const slot = (body.slot as SlotType) || SlotType.LUNCH;
      const idx = db.mealOverrides.findIndex(
        (o) => o.membershipId === currentMem.id && o.date === date && o.slot === slot
      );
      const item: StoredMealOverride = {
        membershipId: currentMem.id,
        date,
        slot,
        status: Boolean(body.status),
        eggPreference: (body.eggPreference as EggPreference) || EggPreference.NONE,
        guestCount: Number(body.guestCount || 0)
      };
      if (idx >= 0) {
        db.mealOverrides[idx] = item;
      } else {
        db.mealOverrides.push(item);
      }
      saveDb(db);
      return item as unknown as T;
    }

    if (subPath === 'meals/force-override' && method === 'POST') {
      const targetMemId = String(body.membershipId || currentMem.id);
      const date = String(body.date || getDhakaDateString());
      const slot = (body.slot as SlotType) || SlotType.LUNCH;
      const idx = db.mealOverrides.findIndex(
        (o) => o.membershipId === targetMemId && o.date === date && o.slot === slot
      );
      const prev = idx >= 0 ? { ...db.mealOverrides[idx] } : null;
      const item: StoredMealOverride = {
        membershipId: targetMemId,
        date,
        slot,
        status: Boolean(body.status),
        eggPreference: (body.eggPreference as EggPreference) || EggPreference.NONE,
        guestCount: Number(body.guestCount || 0)
      };
      if (idx >= 0) {
        db.mealOverrides[idx] = item;
      } else {
        db.mealOverrides.push(item);
      }
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        messId: mess.id,
        actorId: currentUser.id,
        action: 'FORCE_OVERRIDE',
        entity: 'meal_finals',
        before: prev,
        after: { ...item },
        reason: String(body.reason || 'Admin forced locked meal exception'),
        createdAt: new Date().toISOString()
      });
      saveDb(db);
      return item as unknown as T;
    }

    // MENUS
    if (subPath === 'menus' && method === 'POST') {
      const date = String(body.date || getDhakaDateString());
      const existing = db.menus.find((m) => m.messId === mess.id && m.date === date);
      if (existing) {
        existing.protein = body.protein || body.lunchProtein || ProteinType.FISH;
        existing.note = body.note || body.lunchNote || null;
      } else {
        db.menus.push({
          id: `menu-${Date.now()}`,
          messId: mess.id,
          date,
          shopperId: currentMem.id,
          protein: body.protein || body.lunchProtein || ProteinType.FISH,
          note: body.note || body.lunchNote || null
        });
      }
      saveDb(db);
      return { success: true } as unknown as T;
    }

    // ROSTER
    if (subPath === 'roster' && method === 'GET') {
      const month = searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const items = db.roster
        .filter((r) => r.messId === mess.id && r.date.startsWith(month))
        .map((r) => {
          const mem = db.memberships.find((m) => m.id === r.membershipId);
          const usr = mem ? db.users.find((u) => u.id === mem.userId) : undefined;
          return {
            ...r,
            member: mem ? { ...mem, user: usr } : undefined
          };
        });
      return items as unknown as T;
    }

    if (subPath === 'roster/vote' && method === 'POST') {
      const date = String(body.date || getDhakaDateString());
      const exists = db.roster.find(
        (r) => r.messId === mess.id && r.date === date && r.membershipId === currentMem.id
      );
      if (!exists) {
        db.roster.push({
          id: `ros-${Date.now()}`,
          messId: mess.id,
          date,
          membershipId: currentMem.id,
          source: RosterSource.VOTE,
          member: { ...currentMem, user: currentUser }
        });
        saveDb(db);
      }
      return { success: true } as unknown as T;
    }

    if (subPath === 'roster/auto-shuffle' && method === 'POST') {
      const month = searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const members = db.memberships.filter((m) => m.messId === mess.id && m.isActive);
      if (members.length > 0) {
        for (let d = 1; d <= 10; d += 2) {
          const dateStr = `${month}-${String(d).padStart(2, '0')}`;
          const assigned = db.roster.filter((r) => r.messId === mess.id && r.date === dateStr);
          if (assigned.length === 0) {
            const pick = members[d % members.length]!;
            const usr = db.users.find((u) => u.id === pick.userId);
            db.roster.push({
              id: `ros-${Date.now()}-${d}`,
              messId: mess.id,
              date: dateStr,
              membershipId: pick.id,
              source: RosterSource.AUTO,
              member: { ...pick, user: usr }
            });
          }
        }
        saveDb(db);
      }
      return { success: true } as unknown as T;
    }

    if (subPath === 'roster/swap' && method === 'POST') {
      return { success: true } as unknown as T;
    }

    if (subPath === 'roster/assign' && method === 'POST') {
      const targetMemId = String(body.membershipId || currentMem.id);
      const date = String(body.date || getDhakaDateString());
      const mem = db.memberships.find((m) => m.id === targetMemId);
      const usr = mem ? db.users.find((u) => u.id === mem.userId) : undefined;
      const entry: ShoppingRosterDto = {
        id: `ros-${Date.now()}`,
        messId: mess.id,
        date,
        membershipId: targetMemId,
        source: RosterSource.AUTO,
        member: mem ? { ...mem, user: usr } : undefined
      };
      db.roster.push(entry);
      saveDb(db);
      return entry as unknown as T;
    }

    // EXPENSES
    if (subPath === 'expenses/shopping' && method === 'GET') {
      const month = searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const list = db.expenses
        .filter((e) => e.messId === mess.id && e.date.startsWith(month))
        .map((e) => {
          const mem = db.memberships.find((m) => m.id === e.shopperId);
          const usr = mem ? db.users.find((u) => u.id === mem.userId) : undefined;
          return {
            ...e,
            shopper: mem ? { ...mem, user: usr } : e.shopper
          };
        });
      return list as unknown as T;
    }

    if (subPath === 'expenses/shopping' && method === 'POST') {
      const rawItems = Array.isArray(body.items) ? body.items : [];
      const expId = `exp-${Date.now()}`;
      let sum = 0;
      const items = rawItems.map(
        (it: { name?: string; quantity?: string; price?: number }, idx: number) => {
          const p = Number(it.price || 0);
          sum += p;
          return {
            id: `item-${Date.now()}-${idx}`,
            expenseId: expId,
            name: String(it.name || 'Item'),
            quantity: it.quantity ? String(it.quantity) : null,
            price: p.toFixed(2)
          };
        }
      );
      const newExp: ShoppingExpenseDto = {
        id: expId,
        messId: mess.id,
        date: String(body.date || getDhakaDateString()),
        shopperId: currentMem.id,
        total: sum.toFixed(2),
        status: ExpenseStatus.APPROVED,
        receiptUrl: body.receiptUrl ? String(body.receiptUrl) : null,
        items,
        shopper: { ...currentMem, user: currentUser }
      };
      db.expenses.unshift(newExp);
      saveDb(db);
      return newExp as unknown as T;
    }

    const approveMatch = subPath.match(/^expenses\/shopping\/([^/]+)\/approve$/);
    if (approveMatch && method === 'POST') {
      const exp = db.expenses.find((e) => e.id === approveMatch[1]);
      if (exp) {
        exp.status = ExpenseStatus.APPROVED;
        saveDb(db);
      }
      return exp as unknown as T;
    }

    const rejectMatch = subPath.match(/^expenses\/shopping\/([^/]+)\/reject$/);
    if (rejectMatch && method === 'POST') {
      const exp = db.expenses.find((e) => e.id === rejectMatch[1]);
      if (exp) {
        exp.status = ExpenseStatus.REJECTED;
        saveDb(db);
      }
      return exp as unknown as T;
    }

    if (subPath === 'expenses/fuel' && method === 'POST') {
      const nowIso = new Date().toISOString();
      const amount = Number(body.amount || 0);
      const members = db.memberships.filter((m) => m.messId === mess.id && m.isActive);
      const perMemberFuel = members.length > 0 ? amount / members.length : amount;

      for (const m of members) {
        db.ledger.unshift({
          id: `led-${Date.now()}-${m.id}`,
          membershipId: m.id,
          type: LedgerType.FUEL,
          amount: perMemberFuel.toFixed(2),
          date: String(body.date || getDhakaDateString()),
          referenceId: null,
          note: body.note ? String(body.note) : 'Fuel/gas expense share',
          createdBy: currentUser.id,
          createdAt: nowIso
        });
      }
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        messId: mess.id,
        actorId: currentUser.id,
        action: 'FUEL_EXPENSE_RECORDED',
        entity: 'fuel_expenses',
        before: null,
        after: { amount: amount.toFixed(2), note: body.note },
        reason: body.note ? String(body.note) : 'Admin recorded fuel/gas cylinder expense',
        createdAt: nowIso
      });
      saveDb(db);
      return { success: true } as unknown as T;
    }

    // LEDGER
    const balMatch = subPath.match(/^ledger\/balance\/([^/]+)$/);
    if (balMatch && method === 'GET') {
      const targetMemId = balMatch[1]!;
      const entries = db.ledger.filter((l) => l.membershipId === targetMemId);
      const deposits = entries
        .filter((e) => e.type === LedgerType.DEPOSIT)
        .reduce((acc, e) => acc + Number(e.amount), 0);
      const debits = entries
        .filter((e) => e.type !== LedgerType.DEPOSIT)
        .reduce((acc, e) => acc + Number(e.amount), 0);
      const estimatedMealsTaken = 12;
      const estimatedSpent = estimatedMealsTaken * Number(mess.mealRate) + debits;
      const currentBalance = deposits - estimatedSpent;
      const dailyCost = Number(mess.mealRate) + 15;
      const daysLeft = dailyCost > 0 ? Math.floor(currentBalance / dailyCost) : 10;

      let status = BalanceStatus.HEALTHY;
      if (daysLeft <= 0) status = BalanceStatus.GRACE;
      else if (daysLeft <= mess.warningDays) status = BalanceStatus.WARNING;

      return {
        currentBalance: currentBalance.toFixed(2),
        dailyEstimatedCost: dailyCost.toFixed(2),
        daysRemaining: daysLeft,
        status,
        graceDaysUsed: daysLeft < 0 ? Math.min(mess.graceDays, Math.abs(daysLeft)) : 0,
        graceDaysLeft:
          daysLeft < 0 ? Math.max(0, mess.graceDays - Math.abs(daysLeft)) : mess.graceDays,
        isAutoOff: false
      } as unknown as T;
    }

    const stmtMatch = subPath.match(/^ledger\/statement\/([^/]+)$/);
    if (stmtMatch && method === 'GET') {
      const targetMemId = stmtMatch[1]!;
      const entries = db.ledger.filter((l) => l.membershipId === targetMemId);
      return entries as unknown as T;
    }

    if (subPath === 'ledger/deposit' && method === 'POST') {
      const nowIso = new Date().toISOString();
      const targetMemId = String(body.membershipId || currentMem.id);
      const amountStr = Number(body.amount || 0).toFixed(2);
      const entry: LedgerEntryDto = {
        id: `led-${Date.now()}`,
        membershipId: targetMemId,
        type: LedgerType.DEPOSIT,
        amount: amountStr,
        date: getDhakaDateString(),
        referenceId: null,
        note: body.note ? String(body.note) : 'Cash deposit',
        createdBy: currentUser.id,
        createdAt: nowIso
      };
      db.ledger.unshift(entry);
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        messId: mess.id,
        actorId: currentUser.id,
        action: 'DEPOSIT_RECORDED',
        entity: 'ledger_entries',
        before: null,
        after: { membershipId: targetMemId, amount: amountStr },
        reason: body.note ? String(body.note) : 'Manager deposit entry',
        createdAt: nowIso
      });
      saveDb(db);
      return entry as unknown as T;
    }

    if (subPath === 'ledger/adjustment' && method === 'POST') {
      const nowIso = new Date().toISOString();
      const targetMemId = String(body.membershipId || currentMem.id);
      const amountStr = Number(body.amount || 0).toFixed(2);
      const adjType = (body.type as LedgerType) || LedgerType.ADJUSTMENT;
      const entry: LedgerEntryDto = {
        id: `led-${Date.now()}`,
        membershipId: targetMemId,
        type: adjType,
        amount: amountStr,
        date: String(body.date || getDhakaDateString()),
        referenceId: null,
        note: body.reason ? String(body.reason) : 'Admin reversing adjustment',
        createdBy: currentUser.id,
        createdAt: nowIso
      };
      db.ledger.unshift(entry);
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        messId: mess.id,
        actorId: currentUser.id,
        action: 'LEDGER_ADJUSTMENT',
        entity: 'ledger_entries',
        before: null,
        after: { membershipId: targetMemId, type: adjType, amount: amountStr },
        reason: String(body.reason || 'Admin ledger adjustment'),
        createdAt: nowIso
      });
      saveDb(db);
      return entry as unknown as T;
    }

    // NOTICES
    if (subPath === 'notices' && method === 'GET') {
      return db.notices.filter((n) => n.messId === mess.id) as unknown as T;
    }

    if (subPath === 'notices' && method === 'POST') {
      const notice: NoticeDto = {
        id: `not-${Date.now()}`,
        messId: mess.id,
        authorId: currentUser.id,
        authorName: currentUser.name,
        title: String(body.title || 'Notice'),
        body: String(body.body || ''),
        createdAt: new Date().toISOString()
      };
      db.notices.unshift(notice);
      saveDb(db);
      return notice as unknown as T;
    }

    const noticeDelMatch = subPath.match(/^notices\/([^/]+)$/);
    if (noticeDelMatch && method === 'DELETE') {
      const idx = db.notices.findIndex((n) => n.id === noticeDelMatch[1]);
      if (idx >= 0) {
        db.notices.splice(idx, 1);
        saveDb(db);
      }
      return { success: true } as unknown as T;
    }

    // REPORTS
    if (subPath === 'reports/statement' && method === 'GET') {
      const month = searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const members = db.memberships.filter((m) => m.messId === mess.id && m.isActive);
      const monthExpenses = db.expenses.filter(
        (e) => e.messId === mess.id && e.date.startsWith(month)
      );
      const totalMarket = monthExpenses.reduce((acc, e) => acc + Number(e.total), 0) || 4500;
      const totalMeals = members.length * 24;
      const actualRate = totalMeals > 0 ? totalMarket / totalMeals : Number(mess.mealRate);
      const totalFuel = 900;

      let totalDepositsAll = 0;
      const memberRows = members.map((m) => {
        const usr = db.users.find((u) => u.id === m.userId) || m.user;
        const mMeals = 24;
        const mealCost = mMeals * actualRate;
        const fuelCost = totalFuel / members.length;
        const cookBill = Number(m.cookBillAmount || 250);
        const totalDebits = mealCost + fuelCost + cookBill;
        const mDeposits = db.ledger
          .filter((l) => l.membershipId === m.id && l.type === LedgerType.DEPOSIT)
          .reduce((acc, l) => acc + Number(l.amount), 0);
        totalDepositsAll += mDeposits;
        const finalBalance = mDeposits - totalDebits;

        return {
          membershipId: m.id,
          userName: usr?.name || 'Member',
          userPhone: usr?.phone || '',
          totalMeals: mMeals,
          mealCost: mealCost.toFixed(2),
          fuelCost: fuelCost.toFixed(2),
          cookBill: cookBill.toFixed(2),
          otherDebits: '0.00',
          totalDebits: totalDebits.toFixed(2),
          totalDeposits: mDeposits.toFixed(2),
          finalBalance: finalBalance.toFixed(2),
          status: finalBalance >= 0 ? BalanceStatus.HEALTHY : BalanceStatus.GRACE
        };
      });

      const closeKey = `${mess.id}:${month}`;
      const closedAt = db.closedMonths[closeKey];

      const statement: MonthStatementDto = {
        month,
        messName: mess.name,
        isClosed: Boolean(closedAt),
        closedAt,
        actualMealRate: actualRate.toFixed(2),
        estimatedMealRate: Number(mess.mealRate).toFixed(2),
        totalMeals,
        totalMarketCost: totalMarket.toFixed(2),
        totalFuelCost: totalFuel.toFixed(2),
        totalDeposits: totalDepositsAll.toFixed(2),
        members: memberRows
      };
      return statement as unknown as T;
    }

    if (subPath === 'reports/close-month' && method === 'POST') {
      const month = String(body.month || getDhakaDateString().slice(0, 7));
      const nowIso = new Date().toISOString();
      db.closedMonths[`${mess.id}:${month}`] = nowIso;
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        messId: mess.id,
        actorId: currentUser.id,
        action: 'MONTH_CLOSE',
        entity: 'month_closes',
        before: null,
        after: { month, isLocked: true },
        reason: `Month ${month} closed and reconciled by manager`,
        createdAt: nowIso
      });
      saveDb(db);
      return {
        id: `mc-${Date.now()}`,
        messId: mess.id,
        month,
        closedById: currentUser.id,
        isLocked: true,
        closedAt: nowIso
      } as unknown as T;
    }

    // AUDIT LOGS
    if (subPath === 'audit' && method === 'GET') {
      return db.auditLogs.filter((a) => a.messId === mess.id) as unknown as T;
    }
  }

  return {} as unknown as T;
}
