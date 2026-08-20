import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../theme';
import { Body, Btn, Card, Label, Mono, SectionHeader, Toast } from '../components/ui';
import { CosmeticPreview } from '../components/Cosmetics';
import { CrateArt, FilmStack } from '../components/CrateArt';
import { ProceduralPhoto } from '../components/ProceduralPhoto';
import { CountUp, FadeIn, PressScale, useFlash } from '../components/motion';
import { Cosmetic, SHOP_ITEMS } from '../data/catalog';
import {
  LOOT_BOXES,
  FILM_PACKS,
  PAID_BOX_ID,
  RARITY_ORDER,
  RARITY_LABEL,
  RARITY_COLOR,
  itemOdds,
  boxAvailability,
  type LootBox,
  type UtilityItem,
} from '../data/lootboxes';
import { ECONOMY } from '../data/economy';
import { TEST_STORE_COUNTRY } from '../config';
import { useGame, type OpenBoxResult } from '../engine/GameContext';
import { Animated } from 'react-native';
import Svg, { Line as SvgLine, Rect } from 'react-native-svg';

// ---------------------------------------------------------------------------
// The store, reorganised around one question per shelf.
//
// The previous layout was five identical tile grids and the player had to
// open every box to learn the one number that separates them. The order now
// answers, top to bottom: what is the flagship (the paid case, alone), what
// do my earnings buy (the four FILM crates, with their odds ladder visible on
// the shelf), how do I get more FILM, and what cosmetics exist.
//
// Rarity is a colour everywhere: grey, green, blue, acid. The odds strip on
// each tile is those four colours at their true proportions, so "better box"
// is something you can see across the shelf without reading a single number.
// ---------------------------------------------------------------------------

export function Shop({ embedded = false }: { embedded?: boolean } = {}) {
  const { go, profile, purchase, openBox, buyFilmPack, ageBracket, seen, markSeen } =
    useGame();
  const [toast, setToast] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  // Frames are the only cosmetic sold here. The rest of the catalogue
  // (titles, pins, blackout styles, tags) comes from the season pass and
  // drops, and a grid of them in the store was clutter that outranked the
  // things that matter: crates, FILM, frames.
  const frames = SHOP_ITEMS.filter((i) => i.category === 'frame');

  /**
   * The one disclosure that stays in the app: buying anything permanently
   * removes ads. Permanent consequences of spending belong in front of the
   * player, not in the Terms. Shown on entry until dismissed for good.
   */
  const [adsNotice, setAdsNotice] = useState(!seen.adsNoticeHidden);

  /** The box whose contents are open, or null. */
  const [detail, setDetail] = useState<LootBox | null>(null);

  /** The result of the open being revealed, or null. */
  const [reveal, setReveal] = useState<OpenBoxResult | null>(null);
  /** Which crate's art to show behind the reveal. */
  const [revealBoxId, setRevealBoxId] = useState<string>('box-tray');

  const buyBox = (box: LootBox) => {
    const result = openBox(box.id);
    if (!result) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRevealBoxId(box.id);
    setDetail(null);
    setReveal(result);
  };

  const paidBox = LOOT_BOXES.find((b) => b.id === PAID_BOX_ID)!;
  const filmBoxes = LOOT_BOXES.filter((b) => b.id !== PAID_BOX_ID);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: space(5),
          paddingTop: embedded ? space(4) : insets.top + space(4),
          paddingBottom: space(10),
        }}
      >
        {!embedded && (
          <Pressable onPress={() => go('home')} hitSlop={10}>
            <Label tone="faint">← Home</Label>
          </Pressable>
        )}

        <FadeIn>
          <View style={styles.header}>
            <Text style={styles.h1}>Shop</Text>
            <View style={styles.filmChip}>
              <CosmeticPreview kind="film" size={22} />
              <CountUp value={profile.film} style={styles.filmAmount} />
              <Label tone="faint" style={{ fontSize: 8 }}>
                FILM
              </Label>
            </View>
          </View>
        </FadeIn>

        {/* ---- the flagship, alone at the top ---- */}
        <FadeIn index={1}>
          <FeaturedCase box={paidBox} onOpen={() => setDetail(paidBox)} />
        </FadeIn>

        {/* ---- FILM crates ---- */}
        <FadeIn index={2}>
          <SectionHeader
            title="Film crates"
            right="ODDS PUBLISHED"
            style={{ marginTop: space(6), marginBottom: space(3) }}
          />
        </FadeIn>
        <View style={styles.boxGrid}>
          {filmBoxes.map((box, i) => (
            <BoxTile
              key={box.id}
              box={box}
              index={i}
              bracket={ageBracket}
              onOpen={() => setDetail(box)}
            />
          ))}
        </View>
        <RarityKey />

        {/* ---- FILM ---- */}
        <FadeIn index={3}>
          <SectionHeader
            title="Film"
            right="OPENS ANY CRATE"
            style={{ marginTop: space(6), marginBottom: space(3) }}
          />
        </FadeIn>

        {/* Rewarded video. Capped, and the cap is shown rather than discovered
            when the fourth one silently pays nothing. */}
        <FadeIn index={3}>
          <Card style={{ padding: 0, marginBottom: space(3) }}>
            <PressScale onPress={() => Haptics.selectionAsync()} style={styles.filmRow}>
              <View style={styles.filmRowLeft}>
                <CosmeticPreview kind="film" size={34} tint={color.dim} />
                <View style={styles.filmRowText}>
                  <Text style={styles.itemName}>WATCH AN AD</Text>
                  <Mono style={styles.filmRowSub}>
                    {ECONOMY.rewardedAd.seconds} seconds. {ECONOMY.rewardedAd.dailyCap} a day.
                  </Mono>
                </View>
              </View>
              <Mono style={styles.filmRowPrice}>+{ECONOMY.rewardedAd.film}</Mono>
            </PressScale>
          </Card>
        </FadeIn>

        <View style={styles.packGrid}>
          {FILM_PACKS.map((pack, i) => (
            <FadeIn key={pack.id} index={i} delay={60} style={styles.packWrap}>
              <PressScale
                onPress={() => {
                  if (buyFilmPack(pack.film)) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setToast(`+${pack.film.toLocaleString()} FILM`);
                  }
                }}
                style={styles.pack}
              >
                {pack.tag && <Mono style={styles.packTag}>{pack.tag}</Mono>}
                <FilmStack count={i + 1} size={62} />
                <Text style={styles.packFilm}>{pack.film.toLocaleString()}</Text>
                {pack.bonus && <Mono style={styles.packBonus}>{pack.bonus}</Mono>}
                <Text style={styles.packPrice}>{pack.price}</Text>
              </PressScale>
            </FadeIn>
          ))}
        </View>

        {/* Frames get flagship billing among the cosmetics: every check-in
            photo a hider sends is wearing theirs, so it is the one cosmetic
            other players actually look at. */}
        <FadeIn index={2}>
          <SectionHeader
            title="Photo frames"
            right="SEEN BY EVERYONE"
            style={{ marginTop: space(6), marginBottom: space(3) }}
          />
        </FadeIn>
        {frames.map((item, i) => (
          <FrameTile
            key={item.id}
            item={item}
            index={i}
            owned={profile.owned.includes(item.id)}
            affordable={profile.film >= (item.cost ?? 0)}
            onBuy={() => purchase(item.id, item.cost ?? 0)}
          />
        ))}

      </ScrollView>

      <BoxDetail
        box={detail}
        film={profile.film}
        items={profile.items}
        bracket={ageBracket}
        onBuy={buyBox}
        onClose={() => setDetail(null)}
      />

      <OpenReveal
        result={reveal}
        boxId={revealBoxId}
        onClose={() => setReveal(null)}
      />

      <Toast text={toast} onDone={() => setToast(null)} />

      <AdsForeverNotice
        visible={adsNotice}
        onClose={() => setAdsNotice(false)}
        onNeverAgain={() => {
          markSeen({ adsNoticeHidden: true });
          setAdsNotice(false);
        }}
      />
    </View>
  );
}

/**
 * The four rarity colours at their true proportions. This is the store's
 * whole odds story compressed into one glance: a tray is nearly all grey, the
 * vault is mostly blue and acid. Numbers stay one tap away in the detail.
 */
function OddsStrip({ odds, height = 6 }: { odds: LootBox['odds']; height?: number }) {
  return (
    <View style={[styles.oddsStrip, { height, borderRadius: height / 2 }]}>
      {RARITY_ORDER.map((r) =>
        odds[r] > 0 ? (
          <View key={r} style={{ flex: odds[r], backgroundColor: RARITY_COLOR[r] }} />
        ) : null,
      )}
    </View>
  );
}

/** The colour legend, once per shelf rather than once per tile. */
function RarityKey() {
  return (
    <View style={styles.rarityKey}>
      {RARITY_ORDER.map((r) => (
        <View key={r} style={styles.rarityKeyItem}>
          <View style={[styles.rarityDot, { backgroundColor: RARITY_COLOR[r] }]} />
          <Mono style={styles.rarityKeyText}>{RARITY_LABEL[r]}</Mono>
        </View>
      ))}
    </View>
  );
}

/**
 * The paid case gets a banner of its own instead of a slot in the grid.
 *
 * It is the only thing in the store bought with money directly, and the only
 * guaranteed outcome, and both of those facts were invisible when it sat in
 * the same 156px tile as a 1,000 FILM tray.
 */
function FeaturedCase({ box, onOpen }: { box: LootBox; onOpen: () => void }) {
  return (
    <PressScale onPress={onOpen} haptic="light" style={styles.featured}>
      <View style={styles.featuredArt}>
        <CrateArt id={box.id} size={128} />
      </View>
      <View style={styles.featuredText}>
        <Label tone="accent" style={{ fontSize: 9 }}>
          GUARANTEED ELITE
        </Label>
        <Text style={styles.featuredName}>{box.name}</Text>
        <View style={styles.featuredFoot}>
          <View style={styles.featuredPrice}>
            <Mono style={styles.featuredPriceText}>{box.price}</Mono>
          </View>
          <Mono style={styles.featuredCta}>SEE WHAT'S INSIDE →</Mono>
        </View>
      </View>
    </PressScale>
  );
}

/**
 * One crate on the shelf: the art, the name, its odds at a glance, the price.
 * The elite figure is printed because it is the number the whole ladder is
 * about; everything finer waits in the detail.
 */
function BoxTile({
  box,
  index,
  bracket,
  onOpen,
}: {
  box: LootBox;
  index: number;
  bracket: '13_17' | '18_plus' | null;
  onOpen: () => void;
}) {
  const blocked = boxAvailability(bracket, TEST_STORE_COUNTRY, box) !== 'available';
  return (
    <FadeIn index={index} delay={50} style={styles.boxWrap}>
      <PressScale onPress={onOpen} haptic="light">
        <View style={[styles.boxTile, blocked && { opacity: 0.55 }]}>
          {box.tag && (
            <View style={styles.ribbon}>
              <Mono style={styles.ribbonText} numberOfLines={1}>
                {box.tag}
              </Mono>
            </View>
          )}
          {blocked && (
            <View style={styles.agePill}>
              <Mono style={styles.agePillText}>18+</Mono>
            </View>
          )}
          <CrateArt id={box.id} size={104} />
          <Text style={styles.tileName} numberOfLines={1}>
            {box.name}
          </Text>
          <OddsStrip odds={box.odds} />
          <Mono
            style={[
              styles.eliteReadout,
              { color: box.odds.elite > 0 ? RARITY_COLOR.elite : color.faint },
            ]}
          >
            ELITE {Math.round(box.odds.elite * 100)}%
          </Mono>
          <View style={styles.pricePill}>
            {box.film != null && <CosmeticPreview kind="film" size={14} />}
            <Mono style={styles.priceText}>
              {box.price ?? box.film?.toLocaleString()}
            </Mono>
          </View>
        </View>
      </PressScale>
    </FadeIn>
  );
}

/** HIDER / SEEKER / BOTH, so a list of item names reads as a loadout. */
function RoleChip({ role }: { role: UtilityItem['role'] }) {
  const label = role === 'both' ? 'ANY ROLE' : role.toUpperCase();
  return (
    <View style={styles.roleChip}>
      <Mono style={styles.roleChipText}>{label}</Mono>
    </View>
  );
}

/**
 * What is in the box, before you buy it.
 *
 * **The odds live here and this screen is reachable without spending
 * anything.** Apple has required pre-purchase disclosure since 2017 and
 * Google Play since 2019, and it is statutory in China and South Korea. The
 * buy button is deliberately below the odds rather than above them.
 *
 * A bottom sheet rather than a centred dialog: the list is long, and a sheet
 * that slides up from the shelf keeps the store visible behind it, so it
 * reads as looking inside a box rather than leaving the shop.
 */
function BoxDetail({
  box,
  film,
  items,
  bracket,
  onBuy,
  onClose,
}: {
  box: LootBox | null;
  film: number;
  items: Record<string, number>;
  bracket: '13_17' | '18_plus' | null;
  onBuy: (box: LootBox) => void;
  onClose: () => void;
}) {
  if (!box) return null;

  const availability = boxAvailability(bracket, TEST_STORE_COUNTRY, box);
  const blocked = availability !== 'available';
  const affordable = box.film == null || film >= box.film;
  const rows = itemOdds(box);

  // Items grouped under colour-coded rarity headings, best last, so the sheet
  // reads bottom-up the way the anticipation does.
  const groups = RARITY_ORDER.filter((r) => box.odds[r] > 0).map((r) => ({
    rarity: r,
    p: box.odds[r],
    groupItems: rows.filter(({ item }) => item.rarity === r),
  }));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.detailCard}>
          <View style={styles.grabber} />
          <View style={styles.detailHead}>
            <View style={styles.detailHeadArt}>
              <CrateArt id={box.id} size={84} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.detailName}>{box.name}</Text>
              <Body style={styles.detailBlurb}>{box.blurb}</Body>
            </View>
            <PressScale onPress={onClose} style={{ padding: space(1) }}>
              <Mono style={styles.detailClose}>✕</Mono>
            </PressScale>
          </View>

          <OddsStrip odds={box.odds} height={10} />
          <View style={styles.oddsLegend}>
            {RARITY_ORDER.filter((r) => box.odds[r] > 0).map((r) => (
              <View key={r} style={styles.oddsLegendItem}>
                <View style={[styles.rarityDot, { backgroundColor: RARITY_COLOR[r] }]} />
                <Mono style={styles.oddsLegendText}>
                  {RARITY_LABEL[r]}{' '}
                  {(box.odds[r] * 100).toFixed(box.odds[r] < 0.01 ? 1 : 0)}%
                </Mono>
              </View>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator>
            {groups.map(({ rarity, groupItems }) => (
              <View key={rarity} style={{ marginTop: space(3) }}>
                <View style={styles.groupHead}>
                  <View style={[styles.rarityDot, { backgroundColor: RARITY_COLOR[rarity] }]} />
                  <Mono style={[styles.groupHeadText, { color: RARITY_COLOR[rarity] }]}>
                    {RARITY_LABEL[rarity]}
                  </Mono>
                  <View style={[styles.groupRule, { backgroundColor: color.line }]} />
                </View>
                {groupItems.map(({ item, p }) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.itemRowTop}>
                        <Mono style={styles.itemRowName} numberOfLines={1}>
                          {item.name}
                        </Mono>
                        <RoleChip role={item.role} />
                        {(items[item.id] ?? 0) > 0 && (
                          <Mono style={styles.ownedMark}>OWNED</Mono>
                        )}
                      </View>
                      <Body style={styles.itemRowBlurb} numberOfLines={2}>
                        {item.blurb}
                      </Body>
                    </View>
                    <Mono style={styles.oddsPct}>{(p * 100).toFixed(2)}%</Mono>
                  </View>
                ))}
              </View>
            ))}

            <Mono style={styles.detailFoot}>
              ONE ITEM PER OPEN · DUPLICATES REFUND FILM · ODDS NEVER IMPROVE ·
              ONE ITEM USABLE PER ROUND
            </Mono>
          </ScrollView>

          <View style={{ marginTop: space(4) }}>
            {blocked ? (
              <View style={styles.detailBlocked}>
                <Mono style={styles.detailBlockedText}>
                  {availability === 'blocked_age'
                    ? 'RANDOM ITEMS ARE 18 AND OVER'
                    : 'NOT AVAILABLE IN YOUR REGION'}
                </Mono>
              </View>
            ) : (
              <Btn
                title={box.price ?? `Open for ${box.film?.toLocaleString()} FILM`}
                disabled={!affordable}
                sub={!affordable ? 'not enough FILM' : undefined}
                onPress={() => onBuy(box)}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * The open, staged: the crate rattles, the lid bursts with a flash, the item
 * card springs up in its rarity's colour.
 *
 * Two rules learned the hard way in this codebase:
 *
 * - **Timers drive the stages, animation only decorates them.** A throttled
 *   web frame loop freezes Animated mid-flight (see CountUp), so if the
 *   sequence depended on an animation callback it could hang on the rattling
 *   crate forever. setTimeout still fires; the reveal always arrives.
 * - **A tap anywhere skips to the end.** Nobody gets to make the player watch
 *   a second-long animation for the two-hundredth crate.
 */
function OpenReveal({
  result,
  boxId,
  onClose,
}: {
  result: OpenBoxResult | null;
  boxId: string;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<'rattle' | 'burst'>('rattle');
  const rattle = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const toBurst = () => {
    timers.current.forEach(clearTimeout);
    rattle.stopAnimation();
    rattle.setValue(0);
    setStage('burst');
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.spring(card, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start(() => card.setValue(1));
  };

  useEffect(() => {
    if (!result) return;
    setStage('rattle');
    rattle.setValue(0);
    flash.setValue(0);
    card.setValue(0);
    // An accelerating wobble: three swings, each faster than the last.
    Animated.sequence(
      [220, 160, 110, 80, 60, 45].map((ms, i) =>
        Animated.timing(rattle, {
          toValue: i % 2 === 0 ? 1 : -1,
          duration: ms,
          useNativeDriver: true,
        }),
      ),
    ).start();
    timers.current = [setTimeout(toBurst, 850)];
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result) return null;
  const { item, refund, duplicate } = result;
  const tint = RARITY_COLOR[item.rarity];
  const shown = stage === 'burst';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.revealBackdrop}
        onPress={() => (shown ? onClose() : toBurst())}
      >
        {/* Rarity glow, blooming with the card. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.revealGlow,
            { backgroundColor: tint, opacity: card.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] }) },
          ]}
        />

        <Animated.View
          style={[
            styles.revealArt,
            {
              transform: [
                { translateX: rattle.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) },
                { rotate: rattle.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) },
                { scale: card.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              ],
            },
          ]}
        >
          <CrateArt id={boxId} size={150} open={shown} />
        </Animated.View>

        <Animated.View
          style={{
            alignSelf: 'stretch',
            opacity: card,
            transform: [
              { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
              { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            ],
          }}
        >
          <View style={[styles.revealCard, { borderColor: tint }]}>
            <Mono style={[styles.revealRarity, { color: tint }]}>
              {RARITY_LABEL[item.rarity]}
            </Mono>
            <Text style={styles.revealName}>{item.name}</Text>
            <View style={{ alignSelf: 'center', marginTop: space(2) }}>
              <RoleChip role={item.role} />
            </View>
            <Body style={styles.revealBlurb}>{item.blurb}</Body>
            {duplicate && (
              <Mono style={styles.revealDupe}>
                ALREADY OWNED · +{refund.toLocaleString()} FILM BACK
              </Mono>
            )}
          </View>
          <Btn
            title="Collect"
            style={{ alignSelf: 'stretch', marginTop: space(6) }}
            onPress={onClose}
          />
        </Animated.View>

        {/* The burst. On top of everything, gone in half a second. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: tint, opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }) },
          ]}
        />
      </Pressable>
    </Modal>
  );
}

/**
 * Shown every time the store opens until dismissed for good. It is the only
 * consequence of a purchase here that is permanent and cannot be undone, so
 * it belongs in front of the player at the moment of spending.
 */
function AdsForeverNotice({
  visible,
  onClose,
  onNeverAgain,
}: {
  visible: boolean;
  onClose: () => void;
  onNeverAgain: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.noticeBackdrop}>
        <View style={styles.noticeCard}>
          <View style={styles.noticeArt}>
            <Svg width={132} height={92} viewBox="0 0 132 92">
              {/* An ad banner with the signal cut. The crossed-out slot says
                  the whole thing without a paragraph under it. */}
              <Rect
                x={6}
                y={26}
                width={120}
                height={40}
                rx={5}
                fill={color.surface2}
                stroke={color.lineBright}
                strokeWidth={2}
              />
              {[16, 16 + 22, 16 + 44].map((x) => (
                <Rect key={x} x={x} y={38} width={16} height={4} rx={2} fill={color.faint} />
              ))}
              <Rect x={16} y={50} width={62} height={4} rx={2} fill={color.faint} />
              <SvgLine
                x1={14}
                y1={20}
                x2={118}
                y2={72}
                stroke={color.accent}
                strokeWidth={5}
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <Text style={styles.noticeTitle}>Buy anything, and ads are gone for good.</Text>
          <Btn title="Got it" style={{ marginTop: space(5) }} onPress={onClose} />
          <PressScale onPress={onNeverAgain}>
            <Mono style={styles.noticeNever}>DON'T SHOW THIS AGAIN</Mono>
          </PressScale>
        </View>
      </View>
    </Modal>
  );
}

/**
 * A frame shown the way it is actually experienced: wrapped around a capture,
 * at the size it appears in the seeker's feed. An abstract swatch tells the
 * player nothing about the thing they would be buying.
 */
function FrameTile({
  item,
  index,
  owned,
  affordable,
  onBuy,
}: {
  item: Cosmetic;
  index: number;
  owned: boolean;
  affordable: boolean;
  onBuy: () => boolean;
}) {
  const { flashOpacity, fire } = useFlash();
  // Stable per item so the preview does not reshuffle on every render.
  const seed = useMemo(
    () => item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 37,
    [item.id],
  );

  return (
    <FadeIn index={index} delay={120}>
      <PressScale
        disabled={owned || !affordable}
        haptic="none"
        onPress={() => {
          if (onBuy()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fire();
          }
        }}
        style={[
          styles.frameCard,
          owned && { borderColor: color.accentDim },
          !owned && !affordable && { opacity: 0.55 },
        ]}
      >
        <View style={[styles.framePreview, { borderColor: item.tint }]}>
          <ProceduralPhoto seed={seed} width={92} height={92} variant="back" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label tone="faint" style={{ fontSize: 8 }}>
            PHOTO FRAME
          </Label>
          <Text style={[styles.frameName, { color: item.tint }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.itemPriceRow}>
            {owned ? (
              <Mono style={{ fontSize: 11, color: color.accent, letterSpacing: 1 }}>OWNED</Mono>
            ) : (
              <>
                <CosmeticPreview
                  kind="film"
                  size={14}
                  tint={affordable ? color.accent : color.faint}
                />
                <Mono
                  style={{
                    fontSize: 13,
                    color: affordable ? color.text : color.faint,
                    fontFamily: font.monoSemi,
                  }}
                >
                  {item.cost}
                </Mono>
              </>
            )}
          </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: color.accent, opacity: flashOpacity }]}
        />
      </PressScale>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  // ---- featured case ----
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space(4),
    marginTop: space(5),
    overflow: 'hidden',
  },
  featuredArt: { flexShrink: 0 },
  featuredText: { flex: 1, minWidth: 0 },
  featuredName: {
    fontFamily: font.display,
    fontSize: 20,
    color: color.text,
    marginTop: 3,
  },
  featuredBlurb: {
    fontSize: 12,
    lineHeight: 17,
    color: color.dim,
    marginTop: 4,
  },
  featuredFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(3),
    gap: space(2),
  },
  featuredPrice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: space(3.5),
    paddingVertical: space(1.5),
  },
  featuredPriceText: { fontFamily: font.monoSemi, fontSize: 13, color: color.black },
  featuredCta: { fontSize: 9, letterSpacing: 1.2, color: color.faint },

  // ---- crate shelf ----
  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space(3),
  },
  boxWrap: { width: '48.2%' },
  boxTile: {
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    paddingVertical: space(4),
    paddingHorizontal: space(3),
    alignItems: 'center',
    gap: space(2),
  },
  // The ribbon sits over the art, like a sale flash on a shelf.
  ribbon: {
    position: 'absolute',
    top: space(3),
    left: 0,
    backgroundColor: color.accent,
    paddingHorizontal: space(2),
    paddingVertical: 3,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    maxWidth: '85%',
    zIndex: 1,
  },
  ribbonText: { fontSize: 7, letterSpacing: 1, color: color.onAccent },
  agePill: {
    position: 'absolute',
    top: space(3),
    right: space(3),
    borderWidth: 1,
    borderColor: color.warn,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    zIndex: 1,
  },
  agePillText: { fontSize: 9, color: color.warn, letterSpacing: 1 },
  tileName: {
    fontFamily: font.display,
    fontSize: 12,
    letterSpacing: 0.8,
    color: color.text,
    textAlign: 'center',
  },
  oddsStrip: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: color.line,
  },
  eliteReadout: { fontSize: 9, letterSpacing: 1.2 },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface2,
    borderRadius: 999,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  priceText: { fontFamily: font.monoSemi, fontSize: 12, color: color.text },
  rarityKey: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space(4),
    marginTop: space(3),
  },
  rarityKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  rarityKeyText: { fontSize: 8, letterSpacing: 1, color: color.dim },

  // ---- box detail sheet ----
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: color.lineBright,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: color.surface,
    padding: space(5),
    paddingBottom: space(8),
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.lineBright,
    marginBottom: space(4),
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    marginBottom: space(4),
  },
  detailHeadArt: { flexShrink: 0 },
  detailName: { fontFamily: font.display, fontSize: 20, color: color.text },
  detailBlurb: { fontSize: 12, color: color.dim, marginTop: 3, lineHeight: 17 },
  detailClose: { fontSize: 16, color: color.faint },
  oddsLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(3),
    marginTop: space(2.5),
    marginBottom: space(1),
  },
  oddsLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  oddsLegendText: { fontSize: 9, letterSpacing: 0.8, color: color.text },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginBottom: space(1),
  },
  groupHeadText: { fontSize: 9, letterSpacing: 1.4 },
  groupRule: { flex: 1, height: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(2),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  itemRowTop: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  itemRowName: { fontFamily: font.monoSemi, fontSize: 11, color: color.text, flexShrink: 1 },
  itemRowBlurb: { fontSize: 11, color: color.dim, lineHeight: 15, marginTop: 2 },
  roleChip: {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  roleChipText: { fontSize: 7, letterSpacing: 1, color: color.faint },
  oddsPct: { fontSize: 11, color: color.accent, fontVariant: ['tabular-nums'] },
  detailFoot: {
    fontSize: 8,
    letterSpacing: 1,
    color: color.faint,
    lineHeight: 13,
    marginTop: space(4),
  },
  detailBlocked: {
    borderWidth: 1,
    borderColor: color.warn,
    borderRadius: radius.sm,
    alignItems: 'center',
    paddingVertical: space(3.5),
  },
  detailBlockedText: { fontSize: 10, letterSpacing: 1.3, color: color.warn },
  ownedMark: { fontSize: 7, letterSpacing: 1, color: color.accent },

  // ---- open reveal ----
  revealBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(6),
  },
  revealArt: { marginBottom: space(2) },
  revealCard: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space(5),
  },
  revealRarity: {
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
  },
  revealName: {
    fontFamily: font.display,
    fontSize: 28,
    color: color.text,
    textAlign: 'center',
    marginTop: space(2),
  },
  revealBlurb: {
    fontSize: 14,
    lineHeight: 20,
    color: color.dim,
    textAlign: 'center',
    marginTop: space(3),
  },
  revealDupe: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: color.accent,
    textAlign: 'center',
    marginTop: space(3),
  },
  revealGlow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '18%',
    width: 420,
    height: 420,
    borderRadius: 210,
  },

  // ---- FILM packs ----
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space(3),
  },
  packWrap: { width: '48.2%' },
  pack: {
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space(3),
    alignItems: 'center',
    gap: 4,
  },
  packTag: { fontSize: 8, letterSpacing: 1.2, color: color.accent },
  packFilm: { fontFamily: font.numeral, fontSize: 22, color: color.text },
  packBonus: { fontSize: 9, letterSpacing: 1, color: color.accent },
  packPrice: { fontFamily: font.display, fontSize: 15, color: color.text, marginTop: 2 },

  // ---- the one notice that stayed ----
  noticeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(6),
  },
  noticeCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space(5),
  },
  noticeArt: { alignItems: 'center', marginBottom: space(4) },
  noticeTitle: {
    fontFamily: font.display,
    fontSize: 21,
    textAlign: 'center',
    lineHeight: 28,
    color: color.text,
    marginTop: space(2),
  },
  noticeNever: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: color.faint,
    textAlign: 'center',
    marginTop: space(4),
  },

  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: space(3),
    gap: space(3),
  },
  h1: {
    fontFamily: font.display,
    fontSize: 34,
    color: color.text,
    letterSpacing: -0.5,
  },
  sectionLede: {
    fontSize: 13,
    lineHeight: 19,
    color: color.dim,
    marginBottom: space(3),
  },
  frameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3.5),
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space(3),
    marginBottom: space(2.5),
    overflow: 'hidden',
  },
  framePreview: {
    borderWidth: 2,
    borderRadius: radius.sm,
    padding: 3,
    overflow: 'hidden',
  },
  frameName: {
    fontFamily: font.display,
    fontSize: 20,
    marginTop: 2,
  },
  filmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filmAmount: {
    fontFamily: font.monoSemi,
    fontSize: 15,
    color: color.text,
  },
  itemName: {
    fontFamily: font.monoSemi,
    fontSize: 12,
    letterSpacing: 1,
    color: color.text,
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: space(2),
  },
  filmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space(3.5),
    gap: space(3),
  },
  filmRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    flex: 1,
    minWidth: 0,
  },
  filmRowText: { flex: 1, minWidth: 0 },
  filmRowSub: { fontSize: 10, color: color.faint },
  filmRowPrice: {
    fontSize: 12,
    color: color.accent,
    fontFamily: font.monoSemi,
    flexShrink: 0,
  },
});
