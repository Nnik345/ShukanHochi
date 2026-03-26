import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DEFAULT_AVATAR_ID, normalizeAvatarId } from '../constants/avatarOptions';

const XP_PER_LEVEL = 100;
const DIFFICULTY_XP = { Easy: 10, Medium: 25, Hard: 50 };
const STAT_POINTS_PER_LEVEL = 3;

export const CATEGORIES = [
  { id: 'physical', name: 'Physical', stat: 'str', icon: '💪', color: '#ef4444', desc: '+1 Strength' },
  { id: 'mental', name: 'Mental', stat: 'int', icon: '🧠', color: '#818cf8', desc: '+1 Intelligence' },
  { id: 'creative', name: 'Creative', stat: 'dex', icon: '🎨', color: '#22c55e', desc: '+1 Dexterity' },
];

export const SKILLS = [
  { id: 'basic_attack', name: 'Basic Attack', desc: 'Auto-attack every second', level: 1, icon: '⚔️' },
  { id: 'warriors_resolve', name: "Warrior's Resolve", desc: '+20% physical damage', level: 2, icon: '🛡️' },
  { id: 'arcane_focus', name: 'Arcane Focus', desc: '+20% magic damage', level: 3, icon: '🔮' },
  { id: 'quick_reflexes', name: 'Quick Reflexes', desc: '+5% crit chance', level: 5, icon: '⚡' },
  { id: 'battle_fury', name: 'Battle Fury', desc: '+25% all damage', level: 7, icon: '🔥' },
  { id: 'dual_mastery', name: 'Dual Mastery', desc: 'STR boosts magic, INT boosts physical', level: 10, icon: '✨' },
];

const BOSS_NAMES = [
  'Slime King', 'Shadow Wolf', 'Stone Golem', 'Dark Mage',
  'Shadow Dragon', 'Lich Lord', 'Demon Prince', 'Void Titan',
  'World Serpent', 'Chaos Emperor',
];

const BOSS_EMOJI = ['🟢', '🐺', '🪨', '🧙‍♀️', '🐉', '💀', '👿', '🌑', '🐍', '👑'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getBossMaxHp(stage) {
  return Math.floor(50 * Math.pow(1.5, stage - 1));
}

function getBossName(stage) {
  return BOSS_NAMES[(stage - 1) % BOSS_NAMES.length];
}

function getBossEmoji(stage) {
  return BOSS_EMOJI[(stage - 1) % BOSS_EMOJI.length];
}

export default function useGameState() {
  const [habits, setHabits] = useState([]);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastCompletionDate, setLastCompletionDate] = useState(null);
  const [username, setUsername] = useState('Hero_Player');
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [stats, setStats] = useState({ str: 1, int: 1, dex: 1 });
  const [unallocatedPoints, setUnallocatedPoints] = useState(0);
  const [combatLog, setCombatLog] = useState([]);
  const [bossDefeatedFlash, setBossDefeatedFlash] = useState(false);

  // Combat state managed via refs for tick accuracy, mirrored to state for rendering
  const combatRef = useRef({
    stage: 1,
    bossHp: getBossMaxHp(1),
    bossMaxHp: getBossMaxHp(1),
    bossName: getBossName(1),
    bossEmoji: getBossEmoji(1),
    mana: 20,
  });
  const [combat, setCombat] = useState(() => ({ ...combatRef.current }));

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpProgress = totalXp % XP_PER_LEVEL;
  const maxMana = 20 + stats.int * 10;

  // Level-up stat point awards
  const prevLevelRef = useRef(level);
  useEffect(() => {
    if (level > prevLevelRef.current) {
      const gained = level - prevLevelRef.current;
      setUnallocatedPoints(p => p + gained * STAT_POINTS_PER_LEVEL);
      prevLevelRef.current = level;
    }
  }, [level]);

  // Boss stage advancement detection
  const prevStageRef = useRef(combat.stage);
  useEffect(() => {
    if (combat.stage > prevStageRef.current) {
      setBossDefeatedFlash(true);
      const t = setTimeout(() => setBossDefeatedFlash(false), 1500);
      prevStageRef.current = combat.stage;
      return () => clearTimeout(t);
    }
  }, [combat.stage]);

  const unlockedSkills = useMemo(() => SKILLS.filter(s => level >= s.level), [level]);

  const tier = useMemo(() => {
    const activeCount = habits.filter(h => !h.archived).length;
    if (activeCount >= 3) return { name: 'Active User', color: '#f59e0b', icon: '⚡' };
    return { name: 'Casual User', color: '#6b7280', icon: '🌱' };
  }, [habits]);

  const unlockedGear = useMemo(() => {
    const gear = [
      { name: 'Wooden Sword', slot: 'Weapon', unlockLevel: 1 },
      { name: 'Leather Shield', slot: 'Shield', unlockLevel: 2 },
      { name: 'Iron Helm', slot: 'Head', unlockLevel: 3 },
      { name: 'Chain Mail', slot: 'Chest', unlockLevel: 5 },
      { name: 'Fire Blade', slot: 'Weapon+', unlockLevel: 7 },
      { name: 'Dragon Shield', slot: 'Shield+', unlockLevel: 10 },
    ];
    return gear.map(g => ({ ...g, unlocked: level >= g.unlockLevel }));
  }, [level]);

  // DPS stats for display
  const dpsStats = useMemo(() => {
    let physMult = 1, magicMult = 1, allMult = 1, bonusCrit = 0;
    if (level >= 2) physMult += 0.2;
    if (level >= 3) magicMult += 0.2;
    if (level >= 5) bonusCrit += 5;
    if (level >= 7) allMult += 0.25;

    let physDmg = (1 + stats.str * 2) * physMult;
    let magicDmg = stats.int * 3 * magicMult;
    if (level >= 10) {
      physDmg += stats.int * 0.5;
      magicDmg += stats.str * 0.5;
    }

    const critChance = Math.min(stats.dex * 0.5 + bonusCrit, 50);
    const avgCritMult = 1 + critChance / 100;
    const totalDps = Math.round((physDmg + magicDmg) * allMult * avgCritMult);

    return {
      physDmg: Math.round(physDmg * allMult),
      magicDmg: Math.round(magicDmg * allMult),
      critChance: Math.round(critChance * 10) / 10,
      totalDps,
      manaRegen: Math.round((1 + stats.int * 0.5) * 10) / 10,
    };
  }, [stats, level]);

  // Keep a ref of stats + level for the combat tick
  const stateRef = useRef({ stats, level, maxMana });
  stateRef.current = { stats, level, maxMana };

  // Idle combat tick
  useEffect(() => {
    const tickId = setInterval(() => {
      const { stats: s, level: lv, maxMana: mm } = stateRef.current;
      const c = combatRef.current;

      let physMult = 1, magicMult = 1, allMult = 1, bonusCrit = 0;
      if (lv >= 2) physMult += 0.2;
      if (lv >= 3) magicMult += 0.2;
      if (lv >= 5) bonusCrit += 5;
      if (lv >= 7) allMult += 0.25;

      const magicCost = 10;
      const manaRegen = 1 + s.int * 0.5;
      let newMana = Math.min(c.mana + manaRegen, mm);

      let physDmg = (1 + s.str * 2) * physMult;
      let magicDmg = 0;
      let usedMagic = false;

      if (newMana >= magicCost && s.int > 0) {
        magicDmg = s.int * 3 * magicMult;
        newMana -= magicCost;
        usedMagic = true;
      }

      if (lv >= 10) {
        physDmg += s.int * 0.5;
        if (usedMagic) magicDmg += s.str * 0.5;
      }

      let totalDmg = (physDmg + magicDmg) * allMult;
      const critChance = Math.min(s.dex * 0.5 + bonusCrit, 50) / 100;
      const isCrit = Math.random() < critChance;
      if (isCrit) totalDmg *= 2;
      totalDmg = Math.max(1, Math.round(totalDmg));

      let newHp = c.bossHp - totalDmg;
      let { stage, bossMaxHp, bossName, bossEmoji } = c;

      if (newHp <= 0) {
        stage += 1;
        bossMaxHp = getBossMaxHp(stage);
        bossName = getBossName(stage);
        bossEmoji = getBossEmoji(stage);
        newHp = bossMaxHp;
      }

      const newCombat = { stage, bossHp: newHp, bossMaxHp, bossName, bossEmoji, mana: newMana };
      combatRef.current = newCombat;
      setCombat(newCombat);

      setCombatLog(prev => [
        ...prev.slice(-3),
        {
          id: Date.now() + Math.random(),
          damage: totalDmg,
          isCrit,
          isMagic: usedMagic,
          offsetX: Math.floor(Math.random() * 40) - 20,
        },
      ]);
    }, 1000);

    return () => clearInterval(tickId);
  }, []);

  const addHabit = useCallback((name, difficulty = 'Medium', category = 'physical') => {
    setHabits(prev => [...prev, {
      id: generateId(),
      name,
      difficulty,
      category,
      completedToday: false,
      completedCount: 0,
      createdAt: Date.now(),
      archived: false,
    }]);
  }, []);

  const completeHabit = useCallback((habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || habit.completedToday) return 0;

    const earned = DIFFICULTY_XP[habit.difficulty] || 25;

    setHabits(prev => prev.map(h =>
      h.id === habitId
        ? { ...h, completedToday: true, completedCount: h.completedCount + 1 }
        : h
    ));

    setTotalXp(prev => prev + earned);

    const cat = CATEGORIES.find(c => c.id === habit.category);
    if (cat) {
      setStats(prev => ({ ...prev, [cat.stat]: prev[cat.stat] + 1 }));
    }

    const today = new Date().toDateString();
    setLastCompletionDate(prev => {
      if (prev !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (prev === yesterday.toDateString()) {
          setStreak(s => s + 1);
        } else {
          setStreak(1);
        }
      }
      return today;
    });

    return earned;
  }, [habits]);

  const allocateStat = useCallback((statKey) => {
    setUnallocatedPoints(prev => {
      if (prev <= 0) return prev;
      setStats(s => ({ ...s, [statKey]: s[statKey] + 1 }));
      return prev - 1;
    });
  }, []);

  const deleteHabit = useCallback((habitId) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
  }, []);

  const resetDaily = useCallback(() => {
    setHabits(prev => prev.map(h => ({ ...h, completedToday: false })));
  }, []);

  const hydrateFromBackend = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return;

    // Mongo user document from fetch `data` (flat fields)
    const profile = payload;

    const name = typeof profile.username === 'string' ? profile.username.trim() : '';
    if (name) setUsername(name);

    if (typeof profile.totalXp === 'number' && profile.totalXp >= 0) {
      setTotalXp(profile.totalXp);
    } else if (
      typeof profile.level === 'number' &&
      typeof profile.xp === 'number' &&
      profile.level >= 1
    ) {
      // Mongo stores level + XP bar (0–99); game uses totalXp
      setTotalXp(Math.max(0, (profile.level - 1) * XP_PER_LEVEL + profile.xp));
    }

    if (typeof profile.streak === 'number' && profile.streak >= 0) {
      setStreak(profile.streak);
    }
    if (typeof profile.unallocatedPoints === 'number' && profile.unallocatedPoints >= 0) {
      setUnallocatedPoints(profile.unallocatedPoints);
    }

    if (profile.stats && typeof profile.stats === 'object') {
      const s = profile.stats;
      setStats(prev => ({
        ...prev,
        str: Number(s.str ?? s.strength ?? prev.str),
        int: Number(s.int ?? s.intelligence ?? prev.int),
        dex: Number(s.dex ?? s.dexterity ?? prev.dex),
      }));
    }

    if (Array.isArray(profile.habits)) setHabits(profile.habits);
    else if (Array.isArray(profile.quests)) setHabits(profile.quests);

    if (profile.combat && typeof profile.combat === 'object') {
      const stage = Math.max(1, Number(profile.combat.stage || 1));
      const bossMaxHp = getBossMaxHp(stage);
      const newCombat = {
        stage,
        bossHp: Number(profile.combat.bossHp || bossMaxHp),
        bossMaxHp,
        bossName: profile.combat.bossName || getBossName(stage),
        bossEmoji: profile.combat.bossEmoji || getBossEmoji(stage),
        mana: Number(profile.combat.mana || 20),
      };
      combatRef.current = newCombat;
      setCombat(newCombat);
    }

    if (typeof profile.avatarId === 'string' && profile.avatarId.trim()) {
      setAvatarId(normalizeAvatarId(profile.avatarId));
    }
  }, []);

  const getSnapshot = useCallback(() => ({
    habits,
    totalXp,
    streak,
    lastCompletionDate,
    stats,
    unallocatedPoints,
    combat: combatRef.current,
    avatarId,
  }), [habits, totalXp, streak, lastCompletionDate, stats, unallocatedPoints, avatarId]);

  return {
    habits, xp: xpProgress, totalXp, level, streak, username,
    avatarId,
    xpToNext: XP_PER_LEVEL, tier, stats, unallocatedPoints,
    combat, combatLog, bossDefeatedFlash, maxMana, dpsStats,
    unlockedSkills, unlockedGear,
    addHabit, completeHabit, allocateStat, deleteHabit, resetDaily,
    hydrateFromBackend, getSnapshot, setAvatarId,
  };
}
