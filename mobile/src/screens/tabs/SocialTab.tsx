import React, { useState } from 'react';
import { View } from 'react-native';
import { color, space } from '../../theme';
import { Body, Display } from '../../components/ui';
import { Segmented } from './Segmented';
import { Friends } from '../Friends';
import { Leaderboard } from '../Leaderboard';
import { useGame } from '../../engine/GameContext';

// ---------------------------------------------------------------------------
// Social: friends, leaderboard, referrals.
//
// Referrals live inside Friends rather than getting their own segment. A
// referral is a friend you brought, so splitting them apart would mean two
// screens that both say "enter a code" and neither of which is obviously the
// right one.
// ---------------------------------------------------------------------------

type Seg = 'friends' | 'leaderboard';

export function SocialTab() {
  const [seg, setSeg] = useState<Seg>('friends');
  const { friends } = useGame();
  const count = friends.friends.filter((f) => !f.blocked).length;

  const options: { key: Seg; label: string }[] = [
    { key: 'friends', label: count > 0 ? `FRIENDS · ${count}` : 'FRIENDS' },
    { key: 'leaderboard', label: 'RANKING' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space(5), paddingTop: space(4) }}>
        <Display>{seg === 'friends' ? 'Friends' : 'Leaderboard'}</Display>
        <Body style={{ color: color.dim, marginTop: space(1) }}>
          {seg === 'friends'
            ? 'Codes only. Nobody can find you here without yours.'
            : 'Ranked on season XP. Handles and scores, nothing else.'}
        </Body>
      </View>
      <Segmented options={options} value={seg} onChange={setSeg} />
      <View style={{ flex: 1 }}>
        {seg === 'friends' ? (
          <Friends embedded />
        ) : (
          <Leaderboard embedded onGoFriends={() => setSeg('friends')} />
        )}
      </View>
    </View>
  );
}
