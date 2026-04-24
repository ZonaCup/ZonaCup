const RIOT_AUTH_BASE = 'https://auth.riotgames.com';
const DEFAULT_ACCOUNT_REGION = 'americas';
const DEFAULT_VAL_REGION = 'latam';
const DEFAULT_SCOPES = 'openid offline_access';

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export function isRiotConfigured() {
  const hasClientId = Boolean(process.env.RIOT_CLIENT_ID);
  const hasApiKey = Boolean(process.env.RIOT_API_KEY);
  const hasClientAuth = Boolean(process.env.RIOT_CLIENT_SECRET || process.env.RIOT_CLIENT_ASSERTION);
  return hasClientId && hasApiKey && hasClientAuth;
}

export function getRiotClientId() {
  return getRequiredEnv('RIOT_CLIENT_ID');
}

export function getRiotApiKey() {
  return getRequiredEnv('RIOT_API_KEY');
}

export function getRiotAccountRegion() {
  return process.env.RIOT_ACCOUNT_REGION || DEFAULT_ACCOUNT_REGION;
}

export function getRiotValRegion() {
  return process.env.RIOT_VAL_REGION || DEFAULT_VAL_REGION;
}

export function getRiotCallbackUrl(origin?: string) {
  if (process.env.RIOT_REDIRECT_URI) {
    return process.env.RIOT_REDIRECT_URI;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;

  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_BASE_URL or RIOT_REDIRECT_URI');
  }

  return `${baseUrl.replace(/\/$/, '')}/api/riot/callback`;
}

export function createRiotAuthorizeUrl(origin: string, state: string) {
  const url = new URL(`${RIOT_AUTH_BASE}/authorize`);
  url.searchParams.set('client_id', getRiotClientId());
  url.searchParams.set('redirect_uri', getRiotCallbackUrl(origin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', process.env.RIOT_SCOPES || DEFAULT_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('ui_locales', 'es-AR es-MX en-US');
  return url.toString();
}

export async function exchangeRiotCodeForTokens(code: string, origin?: string) {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', getRiotCallbackUrl(origin));

  const clientAssertion = process.env.RIOT_CLIENT_ASSERTION;
  const clientSecret = process.env.RIOT_CLIENT_SECRET;

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientAssertion) {
    body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    body.set('client_assertion', clientAssertion);
  } else if (clientSecret) {
    const credentials = Buffer.from(`${getRiotClientId()}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${credentials}`;
  } else {
    throw new Error('Missing RIOT_CLIENT_SECRET or RIOT_CLIENT_ASSERTION');
  }

  const response = await fetch(`${RIOT_AUTH_BASE}/token`, {
    method: 'POST',
    headers,
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Riot token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getRiotAccountMe(accessToken: string) {
  const accountRegion = getRiotAccountRegion();
  const response = await fetch(`https://${accountRegion}.api.riotgames.com/riot/account/v1/accounts/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Riot account lookup failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getValorantAccountByRiotId(gameName: string, tagLine: string) {
  const accountRegion = getRiotAccountRegion();
  const response = await fetch(
    `https://${accountRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    {
      headers: {
        'X-Riot-Token': getRiotApiKey(),
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Riot ID lookup failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function getValorantMatchList(puuid: string) {
  const valRegion = getRiotValRegion();
  const response = await fetch(`https://${valRegion}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${encodeURIComponent(puuid)}`, {
    headers: {
      'X-Riot-Token': getRiotApiKey(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`VAL matchlist failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function getValorantMatch(matchId: string) {
  const valRegion = getRiotValRegion();
  const response = await fetch(`https://${valRegion}.api.riotgames.com/val/match/v1/matches/${encodeURIComponent(matchId)}`, {
    headers: {
      'X-Riot-Token': getRiotApiKey(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`VAL match failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function getValorantContent(locale = 'es-AR') {
  const valRegion = getRiotValRegion();
  const response = await fetch(`https://${valRegion}.api.riotgames.com/val/content/v1/contents?locale=${encodeURIComponent(locale)}`, {
    headers: {
      'X-Riot-Token': getRiotApiKey(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function normalizeMatchListPayload(payload: any) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.history)) {
    return payload.history;
  }

  if (Array.isArray(payload?.matchHistory)) {
    return payload.matchHistory;
  }

  return [];
}

function buildCharacterMap(content: any) {
  const entries = content?.characters || content?.Characters || [];
  const map = new Map<string, string>();

  for (const character of entries) {
    const id = character?.id || character?.uuid || character?.characterId;
    const name =
      character?.name ||
      character?.displayName ||
      character?.localizedNames?.['es-AR'] ||
      character?.localizedNames?.['en-US'];

    if (id && name) {
      map.set(id, name);
    }
  }

  return map;
}

function getWinningTeamId(match: any) {
  const teams = match?.teams || match?.info?.teams || [];
  const winner = teams.find((team: any) => team?.won === true || team?.hasWon === true || team?.win === true);
  return winner?.teamId || winner?.team_id || winner?.id || null;
}

function getPlayers(match: any) {
  return match?.players || match?.info?.players || [];
}

function getMatchMetadata(match: any) {
  return match?.metadata || match?.matchInfo || match?.info || {};
}

export async function getValorantPlayerStats(gameName: string, tagLine: string) {
  const account = await getValorantAccountByRiotId(gameName, tagLine);
  const puuid = account?.puuid;

  if (!puuid) {
    throw new Error('No se encontro el PUUID de la cuenta');
  }

  const [matchListPayload, content] = await Promise.all([
    getValorantMatchList(puuid),
    getValorantContent(),
  ]);

  const history = normalizeMatchListPayload(matchListPayload).slice(0, 10);
  const matchIds = history
    .map((entry: any) => entry?.matchId || entry?.match_id)
    .filter(Boolean);

  const matches = await Promise.all(matchIds.map((matchId: string) => getValorantMatch(matchId)));
  const characterMap = buildCharacterMap(content);

  const summary = {
    matches: 0,
    wins: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    headshots: 0,
    bodyshots: 0,
    legshots: 0,
  };

  const agentStats = new Map<string, {
    agentId: string;
    agentName: string;
    matches: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    headshots: number;
    bodyshots: number;
    legshots: number;
  }>();

  const recentMatches = matches.map((match: any) => {
    const players = getPlayers(match);
    const player = players.find((entry: any) => entry?.puuid === puuid);
    const meta = getMatchMetadata(match);

    if (!player) {
      return null;
    }

    const stats = player?.stats || player?.playerStats || {};
    const characterId = player?.characterId || player?.characterID || player?.character_id || 'unknown';
    const agentName = characterMap.get(characterId) || player?.characterName || 'Agente';
    const playerWon = typeof player?.won === 'boolean'
      ? player.won
      : typeof player?.win === 'boolean'
        ? player.win
        : getWinningTeamId(match) === (player?.teamId || player?.team_id || player?.team);

    const kills = Number(stats?.kills || 0);
    const deaths = Number(stats?.deaths || 0);
    const assists = Number(stats?.assists || 0);
    const score = Number(stats?.score || stats?.combatScore || 0);
    const headshots = Number(stats?.headshots || stats?.headShots || 0);
    const bodyshots = Number(stats?.bodyshots || stats?.bodyShots || 0);
    const legshots = Number(stats?.legshots || stats?.legShots || 0);

    summary.matches += 1;
    summary.wins += playerWon ? 1 : 0;
    summary.kills += kills;
    summary.deaths += deaths;
    summary.assists += assists;
    summary.score += score;
    summary.headshots += headshots;
    summary.bodyshots += bodyshots;
    summary.legshots += legshots;

    const currentAgent = agentStats.get(characterId) || {
      agentId: characterId,
      agentName,
      matches: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      score: 0,
      headshots: 0,
      bodyshots: 0,
      legshots: 0,
    };

    currentAgent.matches += 1;
    currentAgent.wins += playerWon ? 1 : 0;
    currentAgent.kills += kills;
    currentAgent.deaths += deaths;
    currentAgent.assists += assists;
    currentAgent.score += score;
    currentAgent.headshots += headshots;
    currentAgent.bodyshots += bodyshots;
    currentAgent.legshots += legshots;

    agentStats.set(characterId, currentAgent);

    return {
      matchId: meta?.matchId || match?.matchId || null,
      map: meta?.mapId || meta?.mapName || match?.mapId || null,
      startedAt: meta?.gameStartMillis || meta?.gameStartTimeMillis || meta?.gameStart || null,
      mode: meta?.queueId || meta?.gameMode || null,
      agentId: characterId,
      agentName,
      won: playerWon,
      kills,
      deaths,
      assists,
      score,
    };
  }).filter(Boolean);

  const totalShots = summary.headshots + summary.bodyshots + summary.legshots;
  const averageKills = summary.matches ? summary.kills / summary.matches : 0;
  const averageScore = summary.matches ? summary.score / summary.matches : 0;
  const winRate = summary.matches ? (summary.wins / summary.matches) * 100 : 0;
  const kd = summary.deaths ? summary.kills / summary.deaths : summary.kills;
  const hsRate = totalShots ? (summary.headshots / totalShots) * 100 : 0;

  const topAgents = Array.from(agentStats.values())
    .sort((a, b) => b.matches - a.matches || b.kills - a.kills)
    .slice(0, 5)
    .map((agent) => {
      const totalAgentShots = agent.headshots + agent.bodyshots + agent.legshots;

      return {
        ...agent,
        winRate: agent.matches ? (agent.wins / agent.matches) * 100 : 0,
        kd: agent.deaths ? agent.kills / agent.deaths : agent.kills,
        hsRate: totalAgentShots ? (agent.headshots / totalAgentShots) * 100 : 0,
        averageKills: agent.matches ? agent.kills / agent.matches : 0,
        averageScore: agent.matches ? agent.score / agent.matches : 0,
      };
    });

  return {
    account: {
      puuid,
      gameName: account?.gameName || gameName,
      tagLine: account?.tagLine || tagLine,
    },
    summary: {
      ...summary,
      winRate,
      kd,
      hsRate,
      averageKills,
      averageScore,
    },
    topAgents,
    recentMatches,
  };
}
