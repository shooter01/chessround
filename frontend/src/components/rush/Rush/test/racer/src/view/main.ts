import config from '../config';
import type RacerCtrl from '../ctrl';
// import renderClock from 'lib/puz/view/clock';
// import renderHistory from 'lib/puz/view/history';
// import * as licon from 'lib/licon';
// import { copyMeInput } from 'lib/view/controls';
import { type VNode, type MaybeVNodes, bind, looseH as h } from 'snabbdom';
// import { playModifiers, renderCombo } from 'lib/puz/view/util';
import { renderRace } from './race';
import { renderBoard } from './board';
// import { povMessage } from 'lib/puz/run';

export default function (ctrl: RacerCtrl): VNode {
  return h(
    'div.racer.racer-app.racer--play',
    { class: { ...playModifiers(ctrl.run), [`racer--${ctrl.status()}`]: true } },
    [
      renderBoard(ctrl),
      h('div.puz-side', selectScreen(ctrl)),
      renderRace(ctrl),
      ctrl.status() === 'post' && ctrl.run.history.length > 0 ? renderHistory(ctrl) : null,
    ],
  );
}

const selectScreen = (ctrl: RacerCtrl): MaybeVNodes => {
  switch (ctrl.status()) {
    case 'pre': {
      const povMsg = h('p.racer__pre__message__pov', povMessage(ctrl.run));
      return ctrl.race.lobby
        ? [
            waitingToStart(),
            h('div.racer__pre__message.racer__pre__message--with-skip', [
              h('div.racer__pre__message__text', [
                h(
                  'p',
                  ctrl.knowsSkip()
                    ? i18n.storm[ctrl.vm.startsAt ? 'getReady' : 'waitingForMorePlayers']
                    : skipHelp(),
                ),
                povMsg,
              ]),
              !ctrl.knowsSkip() && renderSkip(ctrl),
            ]),
            comboZone(ctrl),
          ]
        : [
            waitingToStart(),
            h('div.racer__pre__message', [
              ...(ctrl.raceFull()
                ? ctrl.isPlayer()
                  ? [renderStart(ctrl)]
                  : []
                : ctrl.isPlayer()
                  ? [renderLink(ctrl), renderStart(ctrl)]
                  : [renderJoin(ctrl)]),
              povMsg,
            ]),
            comboZone(ctrl),
          ];
    }
    case 'racing': {
      const clock = renderClock(ctrl.run, ctrl.end, false);
      return ctrl.isPlayer()
        ? [playerScore(ctrl), h('div.puz-clock', [clock, renderSkip(ctrl)]), comboZone(ctrl)]
        : [
            spectating(),
            h('div.racer__spectating', [
              h('div.puz-clock', clock),
              ctrl.race.lobby ? lobbyNext(ctrl) : waitForRematch(),
            ]),
            comboZone(ctrl),
          ];
    }
    case 'post': {
      const nextRace = ctrl.race.lobby ? lobbyNext(ctrl) : friendNext(ctrl);
      const raceComplete = h('h2', i18n.storm.raceComplete);
      return ctrl.isPlayer()
        ? [
            playerScore(ctrl),
            h('div.racer__post', [raceComplete, yourRank(ctrl), nextRace]),
            comboZone(ctrl),
          ]
        : [spectating(), h('div.racer__post', [raceComplete, nextRace]), comboZone(ctrl)];
    }
  }
};

const renderSkip = (ctrl: RacerCtrl) =>
  h(
    'button.racer__skip.button.button-red',
    {
      class: { disabled: !ctrl.canSkip() },
      attrs: { title: i18n.storm.skipExplanation },
      hook: bind('click', ctrl.skip),
    },
    i18n.storm.skip,
  );

const skipHelp = () => h('p', i18n.storm.skipHelp);

const puzzleRacer = () => h('strong', 'Puzzle Racer');

const waitingToStart = () =>
  h(
    'div.puz-side__top.puz-side__start',
    h('div.puz-side__start__text', [puzzleRacer(), h('span', i18n.storm.waitingToStart)]),
  );

const spectating = () =>
  h(
    'div.puz-side__top.puz-side__start',
    h('div.puz-side__start__text', [puzzleRacer(), h('span', i18n.storm.spectating)]),
  );

const renderBonus = (bonus: number) => `+${bonus}`;

const renderControls = (ctrl: RacerCtrl): VNode =>
  h(
    'div.puz-side__control',
    h('a.puz-side__control__flip.button', {
      class: { active: ctrl.flipped, 'button-empty': !ctrl.flipped },
      attrs: { 'data-icon': licon.ChasingArrows, title: i18n.site.flipBoard + ' (Keyboard: f)' },
      hook: bind('click', ctrl.flip),
    }),
  );

const comboZone = (ctrl: RacerCtrl) =>
  h('div.puz-side__table', [renderControls(ctrl), renderCombo(config, renderBonus)(ctrl.run)]);

const playerScore = (ctrl: RacerCtrl): VNode =>
  h('div.puz-side__top.puz-side__solved', [
    h('div.puz-side__solved__text', `${ctrl.myScore() || 0}`),
  ]);

const renderLink = (ctrl: RacerCtrl) =>
  h('div.puz-side__link', [
    h('p', i18n.site.toInviteSomeoneToPlayGiveThisUrl),
    copyMeInput(`${window.location.protocol}//${window.location.host}/racer/${ctrl.race.id}`),
  ]);

const renderStart = (ctrl: RacerCtrl) =>
  ctrl.isOwner() &&
  !ctrl.vm.startsAt &&
  h(
    'div.puz-side__start',
    h(
      'button.button.button-fat',
      {
        class: { disabled: ctrl.players().length < 2 },
        hook: bind('click', ctrl.start),
        attrs: { disabled: ctrl.players().length < 2 },
      },
      i18n.storm.startTheRace,
    ),
  );

const renderJoin = (ctrl: RacerCtrl) =>
  h(
    'div.puz-side__join',
    h('button.button.button-fat', { hook: bind('click', ctrl.join) }, i18n.storm.joinTheRace),
  );

const yourRank = (ctrl: RacerCtrl) => {
  const score = ctrl.myScore();
  if (!score) return;
  const players = ctrl.players();
  const rank = players.filter((p) => p.score > score).length + 1;
  return h('strong.race__post__rank', i18n.storm.yourRankX(`${rank}/${players.length}`));
};

const waitForRematch = () =>
  h(
    `a.racer__new-race.button.button-fat.button-navaway.disabled`,
    { attrs: { disabled: true } },
    i18n.storm.waitForRematch,
  );

const lobbyNext = (ctrl: RacerCtrl) =>
  h('form', { attrs: { action: '/racer/lobby', method: 'post' } }, [
    h(
      `button.racer__new-race.button.button-navaway${ctrl.race.lobby ? '.button-fat' : '.button-empty'}`,
      i18n.storm.nextRace,
    ),
  ]);

const friendNext = (ctrl: RacerCtrl) =>
  h('div.racer__post__next', [
    h(
      `a.racer__rematch.button.button-fat.button-navaway`,
      { attrs: { href: `/racer/${ctrl.race.id}/rematch` } },
      i18n.storm.joinRematch,
    ),
    h(
      'form.racer__post__next__new',
      { attrs: { action: '/racer', method: 'post' } },
      h(
        'button.racer__post__next__button.button.button-empty',
        { attrs: { type: 'submit' } },
        i18n.storm.createNewGame,
      ),
    ),
  ]);
