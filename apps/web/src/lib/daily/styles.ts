// lib/daily/styles.ts
//
// The prototype's stylesheet, rebuilt from `tokens.ts` and scoped under
// `.np-root`. It lives here rather than in inline styles because the port needs
// media queries, :active press states and pseudo-elements — none of which a
// style object can express. Every value comes from the tokens; no literal
// colour appears below.
//
// Layout ladder:
//   < 768px   one phone-width column, exactly the prototype
//   >= 768px  wider column, larger display type
//   >= 1080px two columns — the run on the left, the roster on the right

import { ambience, colour, motion, radius, surface } from './tokens';

export const dailyCss = `
.np-root{
  position:relative;min-height:100dvh;background:${colour.base};color:${colour.chalk};
  -webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;overflow-x:hidden;
}
.np-root *{box-sizing:border-box;margin:0;padding:0}
.np-root button{font:inherit;color:inherit;background:none;border:none}

/* ---------- ambience ---------- */
.np-flare,.np-flare2,.np-vignette{position:fixed;pointer-events:none;z-index:0}
.np-flare{width:560px;height:440px;right:-200px;top:-170px;filter:blur(6px);background:${ambience.flare}}
.np-flare2{width:480px;height:400px;left:-210px;bottom:-180px;filter:blur(8px);background:${ambience.flare2}}
.np-vignette{inset:0;background:${ambience.vignette}}

/* ---------- the content column ---------- */
.np-stage{
  position:relative;z-index:4;flex:1;width:100%;max-width:440px;margin:0 auto;
  display:flex;flex-direction:column;min-height:100dvh;
}
.np-scroll{
  flex:1;overflow-y:auto;min-height:0;
  padding:calc(14px + env(safe-area-inset-top)) 20px 28px;
}
.np-foot{
  position:relative;z-index:5;
  padding:10px 20px calc(16px + env(safe-area-inset-bottom));
}

/* ---------- type ---------- */
.np-h1{font-weight:900;font-size:30px;letter-spacing:-.02em;line-height:1}
.np-eyebrow{font-size:10.5px;letter-spacing:.22em;color:${colour.ember2};text-transform:uppercase}
.np-tagline{font-weight:900;font-size:clamp(25px,7.2vw,32px);line-height:.98;letter-spacing:-.02em;margin-top:16px}
.np-sub{font-size:13.5px;line-height:1.55;color:${colour.dim};margin-top:11px;max-width:340px}
.np-wordmark{
  font-weight:900;font-size:clamp(44px,13vw,60px);line-height:.84;letter-spacing:-.035em;
  background:${ambience.wordmark};-webkit-background-clip:text;background-clip:text;color:transparent;
}
.np-meta{font-size:12px;color:${colour.dim}}
.np-meta b{color:${colour.chalk};font-weight:500}
.np-section-title{font-size:10.5px;letter-spacing:.2em;color:${colour.dim};margin:20px 0 10px}
.np-build{margin-top:24px;font-size:10.5px;letter-spacing:.14em;color:${colour.dim};text-align:center}

/* ---------- call to action ---------- */
.np-cta{
  width:100%;border-radius:${radius.lg};padding:16px;cursor:pointer;
  font-weight:900;font-size:19px;transition:${motion.tap};
  color:${colour.onEmber};background:${ambience.ctaEmber};
  box-shadow:0 5px 0 ${colour.emberShadow};
}
.np-cta:active{transform:translateY(3px);box-shadow:none}
.np-cta.is-win{
  color:${colour.onGood};background:${ambience.ctaGood};
  box-shadow:0 5px 0 ${colour.goodShadow};
}
.np-cta:disabled{
  background:${colour.mute};color:${colour.muteInk};
  box-shadow:0 5px 0 ${colour.muteShadow};pointer-events:none;
}

/* ---------- surfaces ---------- */
.np-card{
  border-radius:${radius.lg};padding:14px 16px;
  background:${surface.card};border:1px solid ${surface.cardBorder};
}
.np-hero{
  border-radius:${radius['2xl']};padding:20px;
  background:${surface.heroWash};border:1px solid ${surface.heroBorder};
}
.np-hero h2{font-weight:900;font-size:29px;line-height:.96;margin:8px 0 6px}
.np-hero p{font-size:13px;color:${colour.dim};margin-bottom:14px}
.np-pill{
  display:inline-flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.14em;
  padding:4px 10px;border-radius:${radius.pill};color:${colour.ember2};
  border:1px solid ${surface.cardBorder};
}

/* ---------- selectable rows and tiles ---------- */
.np-list{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.np-list.is-tight{margin-top:0}
.np-row{
  display:flex;align-items:center;gap:11px;width:100%;text-align:left;
  padding:10px 12px;border-radius:${radius.md};cursor:pointer;transition:${motion.tap};
  background:${surface.row};border:1.5px solid ${surface.rowBorder};
}
.np-row:active{transform:translateY(2px)}
.np-row.is-sel{background:${surface.rowSelected};border-color:${surface.rowSelectedBorder}}
.np-who{flex:1;font-weight:600;font-size:14px}
.np-who small{display:block;color:${colour.dim};font-weight:400;font-size:11px}
.np-tiles{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}
.np-tile{
  border-radius:${radius.lg};padding:14px;min-height:72px;cursor:pointer;transition:${motion.tap};
  display:flex;flex-direction:column;justify-content:flex-end;text-align:left;
  font-weight:900;font-size:15px;
  background:${surface.card};border:1.5px solid ${surface.cardBorder};
}
.np-tile:active{transform:translateY(2px)}
.np-tile.is-sel{background:${surface.selected};border-color:${surface.selectedBorder}}
.np-tick{
  width:20px;height:20px;flex:0 0 20px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-size:11px;
  color:transparent;border:1px solid ${surface.tickBorder};
}
.np-tick.is-on{color:${colour.onTick};background:${ambience.tick};border-color:transparent}
.np-input{
  width:100%;margin:16px 0 12px;border-radius:${radius.md};padding:12px 14px;
  background:${surface.inputBg};border:1px solid ${surface.inputBorder};
  color:${colour.chalk};font:inherit;font-size:14px;outline:none;
}
.np-input:focus{border-color:${surface.rowSelectedBorder}}

/* ---------- form chips ---------- */
.np-form{display:flex;gap:3px}
.np-form i{
  width:16px;height:18px;border-radius:5px;font-style:normal;font-size:9.5px;
  display:flex;align-items:center;justify-content:center;
}
.np-form i.w{background:${surface.winChip};color:${colour.good}}
.np-form i.l{background:${surface.lossChip};color:${colour.bad}}

/* ---------- onboarding ---------- */
.np-ob{flex:1;display:flex;flex-direction:column;min-height:0}
.np-steps{padding:calc(16px + env(safe-area-inset-top)) 22px 0;display:flex;gap:6px}
.np-steps i{width:22px;height:2.5px;border-radius:2px;background:${surface.stepTrack}}
.np-steps i.is-on{background:${ambience.progress}}
.np-ob-body{
  flex:1;display:flex;flex-direction:column;justify-content:flex-end;
  padding:0 22px 6px;overflow-y:auto;min-height:0;
}
.np-ob-grid{display:block}

/* ---------- hub ---------- */
.np-hub-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.np-hub{display:block}
.np-game-grid{display:block}

/* ---------- bottom nav ----------
   DOM order puts it before the content so desktop can hoist it to the top;
   on a phone the order property pushes it back below. */
.np-nav{
  order:2;position:relative;z-index:6;display:flex;
  border-top:1px solid ${surface.rowBorder};background:${surface.navFace};
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  padding-bottom:env(safe-area-inset-bottom);
}
.np-nav button{
  flex:1;padding:11px 0 12px;text-align:center;cursor:pointer;color:${colour.navIdle};
  transition:${motion.tap};
}
.np-nav button.is-on{color:${colour.ember2}}
.np-nav em{display:block;font-style:normal;font-size:19px;line-height:1}
.np-nav span{font-size:10px;font-weight:600;margin-top:3px;display:block}
.np-scroll{order:1}

/* ---------- cards, rows, bars ---------- */
.np-crd{
  border-radius:${radius.lg};padding:14px 16px;margin-bottom:9px;
  background:${surface.card};border:1px solid ${surface.cardBorder};
}
.np-crd.is-bonus{border-color:${surface.bonusBorder};background:${surface.bonusFace}}
.np-crd.is-resolve{border-color:${surface.resolveBorder};background:${surface.resolveFace}}
.np-t1{display:flex;justify-content:space-between;align-items:center;gap:10px}
.np-t1 b{font-weight:900;font-size:17px}
.np-t1 span{font-size:11px;color:${colour.dim}}
.np-t2{font-size:12.5px;color:${colour.dim};margin-top:4px}
.np-plrow{
  display:flex;align-items:center;gap:12px;width:100%;text-align:left;
  padding:11px 13px;border-radius:${radius.lg};margin-bottom:8px;cursor:pointer;
  background:${surface.row};border:1px solid ${surface.rowBorder};transition:${motion.tap};
}
.np-plrow:active{transform:translateY(2px)}
.np-plrow .np-who{font-size:14.5px}
.np-rt{font-weight:900;font-size:20px;color:${colour.amber}}
.np-lbrow{
  display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:${radius.md};
  margin-bottom:7px;background:${surface.row};border:1px solid ${surface.hairline};
}
.np-lbrow.is-me{border-color:${surface.rowSelectedBorder};background:${surface.rowSelected}}
.np-pos{font-size:12px;color:${colour.dim};width:18px}
.np-pts{font-weight:900;font-size:19px;color:${colour.amber}}
.np-back{
  font-size:12px;color:${colour.dim};cursor:pointer;margin-bottom:12px;display:inline-block;
}
.np-barrow{display:flex;align-items:center;gap:8px;margin-top:7px}
.np-barrow small{font-size:10px;color:${colour.dim};width:64px}
.np-bar{flex:1;height:7px;border-radius:${radius.pill};background:${surface.barTrack};overflow:hidden}
.np-bar i{display:block;height:100%;border-radius:${radius.pill}}
.np-barrow b{font-size:11px;width:32px;text-align:right}
.np-stats{display:flex;gap:9px}
.np-stbox{
  flex:1;border-radius:${radius.lg};padding:13px 6px;text-align:center;
  background:${surface.card};border:1px solid ${surface.cardBorder};
}
.np-stbox small{display:block;font-size:9.5px;letter-spacing:.14em;color:${colour.dim}}
.np-stbox b{font-weight:900;font-size:25px;color:${colour.amber}}

/* ---------- the Pro lock ---------- */
.np-locked{position:relative;overflow:hidden}
.np-locked .np-blur{filter:blur(5px);opacity:.5;pointer-events:none}
.np-lockbar{
  position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:6px;background:${surface.lockScrim};cursor:pointer;width:100%;
}
.np-lockbar span{font-size:10.5px;letter-spacing:.14em;color:${colour.amber}}
.np-lockbar b{font-weight:900;font-size:15px}

/* ---------- Pro ---------- */
.np-pro{
  border-radius:${radius.xl};padding:18px;position:relative;overflow:hidden;
  background:${surface.proFace};border:1px solid ${surface.proBorder};
}
.np-badge{
  position:absolute;top:15px;right:15px;font-size:9px;letter-spacing:.16em;
  color:${colour.onTick};background:${colour.ember2};padding:3px 9px;border-radius:${radius.pill};
}
.np-pro h5{font-weight:900;font-size:23px}
.np-plede{font-size:12.5px;color:${colour.dim};margin-top:4px}
.np-cmprow{
  display:flex;align-items:center;gap:10px;padding:9px 0;
  border-top:1px solid ${surface.hairline};font-size:13px;
}
.np-cmprow.is-head{border-top:none;color:${colour.dim};font-size:10px;letter-spacing:.14em}
.np-cmprow .f1{flex:1}
.np-cmprow .f2,.np-cmprow .f3{width:78px;text-align:center;font-weight:600}
.np-cmprow .f2{color:${colour.proFree}}
.np-cmprow .f3{color:${colour.amber}}
.np-plans{display:flex;gap:9px;margin-top:14px}
.np-pbtn{
  flex:1;border-radius:${radius.md};padding:13px 10px;text-align:center;position:relative;
  background:${surface.planFace};border:1.5px solid ${surface.planBorder};
}
.np-pbtn.is-best{border-color:${colour.ember2};background:${surface.planBest}}
.np-tagx{
  position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-size:8.5px;
  letter-spacing:.12em;background:${colour.ember2};color:${colour.onTick};
  padding:2px 8px;border-radius:${radius.pill};
}
.np-pbtn b{display:block;font-weight:900;font-size:19px}
.np-pbtn span{font-size:10.5px;color:${colour.dim}}
.np-trial{margin-top:11px;text-align:center;font-size:11.5px;color:${colour.dim}}
.np-store{display:flex;gap:9px;margin-top:10px}
.np-sitem{
  flex:1;border-radius:${radius.md};padding:12px 8px;text-align:center;
  background:${surface.card};border:1px solid ${surface.cardBorder};
}
.np-sitem em{display:block;font-style:normal;font-size:19px;margin-bottom:4px}
.np-sitem b{display:block;font-weight:900;font-size:13px}
.np-sitem span{font-size:10px;color:${colour.amber}}

/* settings row */
.np-tog{
  display:flex;justify-content:space-between;align-items:center;gap:14px;width:100%;
  padding:13px 16px;border-radius:${radius.lg};cursor:pointer;text-align:left;
  background:${surface.card};border:1px solid ${surface.cardBorder};
}
.np-tog b{font-size:14px;font-weight:600}
.np-tog small{display:block;color:${colour.dim};font-size:11.5px;margin-top:2px;font-weight:400}
.np-sw{
  width:44px;height:26px;flex:0 0 44px;border-radius:${radius.pill};position:relative;
  background:${colour.switchTrack};transition:.22s;
}
.np-sw::after{
  content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;
  background:${colour.switchKnob};transition:.22s;
}
.np-sw.is-on{background:${surface.switchOn}}
.np-sw.is-on::after{left:21px;background:${colour.ember2}}
.np-tog[disabled]{cursor:default;opacity:.7}

/* ---------- the run ---------- */
.np-run{flex:1;display:flex;flex-direction:column;min-height:0}
.np-top{position:relative;z-index:5;padding:calc(13px + env(safe-area-inset-top)) 20px 0}
.np-seg{display:flex;gap:3px;margin-bottom:12px}
.np-seg i{flex:1;height:3px;border-radius:2px;background:${surface.track};overflow:hidden}
.np-seg i.is-on{background:${ambience.progress}}
.np-seg i.is-cur::after{
  content:'';display:block;height:100%;width:52%;border-radius:2px;background:${ambience.progress};
}
.np-runhead{display:flex;justify-content:space-between;align-items:center;gap:10px}
.np-combo{display:flex;align-items:center;gap:7px;font-size:12px;color:${colour.amber}}
.np-mult{font-weight:900;font-size:15px;color:${colour.ember2}}
.np-body{position:relative;z-index:4;flex:1;overflow-y:auto;min-height:0;padding:16px 20px}

/* the question hero */
.np-gtype{font-size:10.5px;letter-spacing:.2em;color:${colour.ember2};text-transform:uppercase}
.np-ask{
  font-weight:900;font-size:clamp(26px,7.4vw,33px);line-height:.98;
  letter-spacing:-.02em;margin-top:8px;
}
.np-hintline{font-size:12.5px;color:${colour.dim};margin-top:7px}
.np-lede{font-size:13.5px;line-height:1.5;color:${colour.dim};margin-top:9px}
.np-stage-copy{margin-bottom:16px}

/* two-player answer */
.np-duo{display:flex;gap:11px}
.np-pcard{
  flex:1;border-radius:${radius.xl};padding:14px 10px;text-align:center;cursor:pointer;
  position:relative;overflow:hidden;transition:${motion.tap};
  background:${surface.card};border:1.5px solid ${surface.cardBorder};
  box-shadow:0 5px 0 ${surface.drop};
}
.np-pcard:active{transform:translateY(3px);box-shadow:0 2px 0 ${surface.drop}}
.np-pcard[disabled]{cursor:default}
.np-pcard .np-portrait{margin:0 auto 9px}
.np-pcard .np-nm{font-weight:900;font-size:17px;line-height:1.05}
.np-pcard .np-cl{font-size:11px;color:${colour.dim};margin-top:3px}
.np-pcard.is-sel{border-color:${colour.ember2};background:${surface.selected}}
.np-pcard.is-ok{border-color:${colour.good};background:${surface.winChip}}
.np-pcard.is-no{border-color:${colour.bad};background:${surface.lossChip}}
.np-pcard .np-share{
  position:absolute;left:0;bottom:0;height:4px;width:0;
  background:${colour.ember2};transition:width ${motion.reveal};
}
.np-pcard .np-pctv{
  margin-top:8px;font-weight:900;font-size:22px;color:${colour.ember2};
  opacity:0;transition:${motion.enter};
}
.np-pcard.is-reveal .np-pctv{opacity:1}

/* option stack — score / guess / poll / award / order */
.np-opts{display:flex;flex-direction:column;gap:9px}
.np-opt{
  position:relative;overflow:hidden;border-radius:${radius.lg};padding:15px 17px;
  cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;
  text-align:left;font-weight:900;font-size:19px;transition:${motion.tap};
  background:${surface.card};border:1.5px solid ${surface.cardBorder};
  box-shadow:0 4px 0 ${surface.dropSoft};
}
.np-opt:active{transform:translateY(3px);box-shadow:0 1px 0 ${surface.dropSoft}}
.np-opt[disabled]{cursor:default}
.np-opt > span{position:relative;z-index:2}
.np-opt .np-fill{
  position:absolute;left:0;top:0;bottom:0;width:0;z-index:1;
  background:${ambience.optionFill};transition:width ${motion.reveal};
}
.np-opt .np-pc{color:${colour.ember2}}
.np-opt .np-num{font-size:12px;color:${colour.ember2}}
.np-opt.is-sel{border-color:${colour.ember2}}
.np-opt.is-ok{border-color:${colour.good};background:${surface.winChip}}
.np-opt.is-no{border-color:${colour.bad};background:${surface.lossChip}}

/* clue stack — guess */
.np-clues{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.np-clue{
  border-radius:${radius.md};padding:11px 13px;font-size:13.5px;color:${colour.clue};
  background:${surface.row};border:1px solid ${surface.rowBorder};
}
.np-clue b{color:${colour.amber};font-size:11px;margin-right:8px}

/* row list — upset / combo */
.np-rows{display:flex;flex-direction:column;gap:9px}
.np-rowline{
  border-radius:${radius.lg};padding:14px 16px;cursor:pointer;display:flex;
  justify-content:space-between;align-items:center;gap:12px;text-align:left;
  transition:${motion.tap};
  background:${surface.card};border:1.5px solid ${surface.cardBorder};
  box-shadow:0 4px 0 ${surface.dropSoft};
}
.np-rowline:active{transform:translateY(3px);box-shadow:0 1px 0 ${surface.dropSoft}}
.np-rowline[disabled]{cursor:default}
.np-rowline .np-l{font-weight:600;font-size:14.5px}
.np-rowline .np-r{font-size:12.5px;color:${colour.dim}}
.np-rowline.is-sel{border-color:${colour.ember2};background:${surface.rowSelected}}
.np-rowline.is-ok{border-color:${colour.good};background:${surface.winChip}}
.np-rowline.is-no{border-color:${colour.bad};background:${surface.lossChip}}
.np-rowline.is-dim{opacity:.4}

/* this or that */
.np-tt{display:flex;gap:11px;height:210px}
.np-ttc{
  flex:1;border-radius:${radius.xl};position:relative;overflow:hidden;cursor:pointer;
  display:flex;align-items:flex-end;padding:16px;text-align:left;transition:${motion.tap};
  border:1.5px solid ${surface.cardBorder};box-shadow:0 5px 0 ${surface.drop};
}
.np-ttc:active{transform:translateY(3px);box-shadow:0 2px 0 ${surface.drop}}
.np-ttc[disabled]{cursor:default}
.np-ttc .np-bgx{position:absolute;inset:0;z-index:0}
.np-ttc .np-tx{position:relative;z-index:2}
.np-ttc .np-tx b{display:block;font-weight:900;font-size:21px;line-height:1}
.np-ttc .np-tx small{color:${colour.ttSub};font-size:11.5px}
.np-ttc .np-vt{
  position:absolute;left:0;bottom:0;height:5px;width:0;z-index:3;
  background:${colour.ember2};transition:width ${motion.reveal};
}
.np-ttc.is-sel{border-color:${colour.ember2}}

/* rapid round */
.np-timer{
  height:6px;border-radius:${radius.pill};background:${surface.celeBarTrack};
  overflow:hidden;margin-bottom:14px;
}
.np-timer i{
  display:block;height:100%;background:${ambience.progress};transition:width 1s linear;
}
.np-timer.is-urgent i{background:${colour.bad}}
.np-tally{display:flex;gap:5px;margin-bottom:14px}
.np-tally i{width:26px;height:5px;border-radius:${radius.pill};background:${surface.track}}
.np-tally i.w{background:${colour.good}}
.np-tally i.l{background:${colour.bad}}
.np-rapid-q{
  font-weight:900;font-size:clamp(24px,6.8vw,30px);line-height:1.02;
  margin-bottom:18px;min-height:96px;
}

/* feedback sheet */
.np-fb{
  position:fixed;left:0;right:0;bottom:0;z-index:9;
  width:100%;max-width:440px;margin:0 auto;
  padding:20px 20px calc(22px + env(safe-area-inset-bottom));
  border-top-left-radius:26px;border-top-right-radius:26px;
  transform:translateY(105%);transition:transform ${motion.sheet} ${motion.easeSheet};
}
.np-fb.is-up{transform:none}
.np-fb.is-win{background:${surface.sheetWin};border-top:1.5px solid ${surface.sheetWinBorder}}
.np-fb.is-lose{background:${surface.sheetLose};border-top:1.5px solid ${surface.sheetLoseBorder}}
.np-fb.is-info{background:${surface.sheetInfo};border-top:1.5px solid ${surface.sheetInfoBorder}}
.np-fb h4{font-weight:900;font-size:23px;margin-bottom:6px}
.np-fb.is-win h4{color:${colour.good}}
.np-fb.is-lose h4{color:${colour.bad}}
.np-fb.is-info h4{color:${colour.ember2}}
.np-fb p{font-size:13.5px;line-height:1.5;color:${colour.sheetText}}
.np-fb p b{color:${colour.chalk};font-weight:600}
.np-fb .np-cta{margin-top:15px}

/* foil scratch */
.np-scr{
  position:relative;border-radius:${radius.lg};overflow:hidden;min-height:104px;
  touch-action:none;
  background:${surface.scratchFace};border:1px solid ${surface.scratchBorder};
}
.np-scr .np-tx{padding:15px 16px;font-size:13.5px;line-height:1.5;color:${colour.scratchText}}
.np-scr .np-tx b{color:${colour.chalk};font-weight:600}
.np-scr canvas{position:absolute;inset:0;pointer-events:none}
.np-scr .np-hint{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  pointer-events:none;transition:opacity .2s;
}
.np-scr .np-hint span{
  background:${surface.hintFace};color:${colour.hintInk};font-size:10.5px;font-weight:800;
  letter-spacing:.22em;text-transform:uppercase;padding:5px 13px;border-radius:${radius.pill};
}
.np-scr .np-prg{
  position:absolute;left:13px;right:13px;bottom:8px;height:2.5px;
  background:${surface.scratchTrack};border-radius:${radius.pill};opacity:0;transition:opacity .2s;
}
.np-scr .np-prg i{
  display:block;height:100%;width:0;border-radius:${radius.pill};
  background:${ambience.progress};transition:width .09s linear;
}

/* keep / half / double */
.np-table{margin-top:9px;color:${colour.tableText}}
.np-choice3{display:flex;gap:8px;margin-top:15px}
.np-ch{
  flex:1;border-radius:${radius.md};padding:13px 6px;cursor:pointer;text-align:center;
  font-weight:900;font-size:15px;line-height:1.05;transition:${motion.tap};
}
.np-ch:active{transform:translateY(3px);box-shadow:none}
.np-ch[disabled]{opacity:.35;pointer-events:none}
.np-ch small{display:block;font-weight:600;font-size:10px;margin-top:3px;opacity:.75}
.np-ch.is-keep{
  background:${surface.keepFace};border:1px solid ${surface.keepBorder};color:${colour.chalk};
}
.np-ch.is-half{
  background:${surface.halfFace};border:1px solid ${surface.halfBorder};color:${colour.halfInk};
}
.np-ch.is-risk{
  background:${ambience.ctaRisk};color:${colour.riskInk};
  box-shadow:0 4px 0 ${colour.riskShadow};
}
.np-riskbar{
  display:inline-flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.16em;
  color:${colour.riskInk};background:${colour.amber};
  padding:4px 11px;border-radius:${radius.pill};margin-bottom:10px;
}

/* ---------- celebration ----------
   Portalled to document.body, so these selectors deliberately sit outside
   .np-root — including their own reset and reduced-motion guard. */
.np-cele{
  position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:26px;text-align:center;
  opacity:0;transition:opacity ${motion.enter};
  color:${colour.chalk};background:${surface.celeGround};
  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
}
.np-cele *{box-sizing:border-box;margin:0;padding:0}
.np-cele button{font:inherit;color:inherit;background:none;border:none}
.np-cele.is-on{opacity:1}
.np-cele canvas{
  position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;
}
.np-rays{
  position:absolute;width:900px;height:900px;z-index:0;opacity:.55;
  animation:np-spin 22s linear infinite;
}
.np-cele.is-huge .np-rays{opacity:.85;animation-duration:13s}
@keyframes np-spin{to{transform:rotate(360deg)}}
.np-ring{
  position:absolute;z-index:1;border-radius:50%;width:140px;height:140px;opacity:0;
  border:2px solid ${surface.ringBorder};
}
.np-ring.is-go{animation:np-ring-out 1.25s cubic-bezier(.15,.7,.25,1) forwards}
@keyframes np-ring-out{
  0%{transform:scale(.3);opacity:.9}100%{transform:scale(5.2);opacity:0}
}
.np-cele-in{
  position:relative;z-index:3;display:flex;flex-direction:column;
  align-items:center;width:100%;
}
.np-cele-lbl{
  font-size:11px;letter-spacing:.3em;color:${colour.ember2};text-transform:uppercase;
  animation:np-drop .4s cubic-bezier(.2,.9,.3,1) both;
}
.np-cele-ttl{
  font-weight:900;font-size:clamp(30px,9vw,42px);line-height:.94;margin-top:8px;
  letter-spacing:-.02em;animation:np-drop .45s .06s cubic-bezier(.2,.9,.3,1) both;
}
@keyframes np-drop{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:none}}
.np-cele-num{
  font-weight:900;font-variant-numeric:tabular-nums;
  font-size:clamp(80px,27vw,132px);line-height:.86;margin:14px 0 2px;
  letter-spacing:-.045em;background:${ambience.celeNumber};
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 26px rgba(255,138,75,.5));
  animation:np-pop .5s cubic-bezier(.2,1.5,.4,1) both;
}
@keyframes np-pop{
  0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}
}
.np-cele-unit{font-size:12px;letter-spacing:.24em;color:${colour.celeUnit}}
.np-cele-sub{
  font-size:13.5px;color:${colour.celeSub};margin-top:14px;max-width:290px;line-height:1.5;
  animation:np-drop .4s .5s cubic-bezier(.2,.9,.3,1) both;
}
.np-cele-bar-w{
  width:100%;max-width:280px;margin-top:20px;
  animation:np-drop .4s .6s cubic-bezier(.2,.9,.3,1) both;
}
.np-cele-bar-t{
  display:flex;justify-content:space-between;font-size:10.5px;
  color:${colour.dim};margin-bottom:6px;
}
.np-cele-bar-t b{color:${colour.chalk};font-weight:500}
.np-cele-bar{
  height:8px;border-radius:${radius.pill};background:${surface.celeBarTrack};overflow:hidden;
}
.np-cele-bar i{
  display:block;height:100%;width:0;border-radius:${radius.pill};
  background:${ambience.celeBar};transition:width 1s cubic-bezier(.2,.8,.2,1);
}
.np-cele-btn{
  margin-top:26px;width:100%;max-width:280px;opacity:0;transform:translateY(10px);
  transition:opacity .35s,transform .35s;
}
.np-cele-btn.is-on{opacity:1;transform:none}
@media (min-width:1080px){
  .np-cele-sub{max-width:420px;font-size:15px}
  .np-cele-bar-w,.np-cele-btn{max-width:340px}
}
@media (prefers-reduced-motion:reduce){
  .np-cele,.np-cele *,.np-cele *::before,.np-cele *::after{
    animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
}

/* ---------- motion ---------- */
.np-fade{animation:np-in ${motion.enter} ${motion.easeOut} both}
@keyframes np-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* ================= 768px and up ================= */
@media (min-width:768px){
  .np-stage{max-width:680px}
  .np-scroll{padding:32px 32px 40px}
  .np-foot{padding:12px 32px 32px}
  .np-ob-body{padding:0 32px 12px}
  .np-steps{padding:32px 32px 0}
  .np-h1{font-size:38px}
  .np-tagline{font-size:38px}
  .np-wordmark{font-size:72px}
  .np-sub{font-size:15px;max-width:440px}
  .np-hero{padding:28px}
  .np-hero h2{font-size:34px}
  .np-hero p{font-size:14.5px}
  .np-row{padding:13px 15px}
  .np-who{font-size:15px}
  .np-who small{font-size:12px}
  .np-tile{min-height:84px;font-size:16px}
  .np-top{padding:32px 32px 0}
  .np-body{padding:24px 32px}
  .np-ask{font-size:40px}
  .np-hintline{font-size:14px}
  .np-pcard{padding:20px 14px}
  .np-pcard .np-nm{font-size:20px}
  .np-opt{padding:18px 20px;font-size:21px}
  .np-rowline{padding:17px 19px}
  .np-rowline .np-l{font-size:16px}
  .np-tt{height:260px}
  .np-ttc .np-tx b{font-size:24px}
  .np-scr{min-height:120px}
  .np-scr .np-tx{padding:18px 20px;font-size:15px}
  .np-ch{padding:16px 8px;font-size:17px}
  .np-ch small{font-size:11px}
  .np-fb{max-width:680px;padding:26px 32px calc(28px + env(safe-area-inset-bottom))}
  .np-fb h4{font-size:26px}
  .np-fb p{font-size:15px}
  .np-flare{width:900px;height:720px;right:-280px;top:-260px}
  .np-flare2{width:820px;height:660px;left:-300px;bottom:-280px}
}

/* ================= 1080px and up — two columns ================= */
@media (min-width:1080px){
  .np-stage{max-width:1120px}
  .np-scroll{padding:48px 48px 56px}
  .np-foot{padding:16px 48px 40px}
  .np-steps{padding:40px 48px 0}
  .np-ob-body{padding:0 48px 24px;justify-content:center}
  .np-h1{font-size:44px}
  .np-tagline{font-size:44px}
  .np-wordmark{font-size:86px}
  .np-hero h2{font-size:40px}

  /* onboarding: copy on the left, the choices on the right */
  .np-ob-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;
    width:100%;
  }
  .np-ob-choices{max-height:60dvh;overflow-y:auto;padding-right:4px}
  .np-ob-choices .np-list{margin-top:0}
  .np-ob-choices .np-input{margin-top:0}
  .np-foot .np-cta{max-width:calc(50% - 28px)}

  /* the run: question on the left, the answer on the right */
  .np-top{padding:40px 48px 0}
  .np-body{padding:40px 48px;display:flex;align-items:center}
  .np-game-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;width:100%;
  }
  .np-stage-copy{margin-bottom:0}
  .np-ask{font-size:46px}
  .np-pcard{padding:26px 18px}
  .np-pcard .np-nm{font-size:22px}
  .np-tt{height:300px}
  .np-rapid-q{font-size:38px;min-height:0}
  .np-fb{max-width:1120px;padding:28px 48px calc(32px + env(safe-area-inset-bottom))}
  .np-choice3{max-width:560px}
  .np-fb .np-cta{max-width:340px}

  .np-nav{
    order:0;border-top:none;background:none;backdrop-filter:none;
    padding:36px 48px 0;gap:6px;justify-content:flex-start;
  }
  .np-nav button{
    flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:10px 16px;
    border-radius:${radius.pill};font-size:14px;font-weight:600;
  }
  .np-nav button.is-on{background:${surface.selected}}
  .np-nav em{font-size:16px}
  .np-nav span{margin-top:0;font-size:13px}
  .np-scroll{order:1}
  .np-stats{max-width:520px}

  /* hub: the run on the left, the roster on the right */
  .np-hub{
    display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:start;
  }
  .np-hub-head{grid-column:1 / -1;margin-bottom:24px}
  .np-hub-side .np-section-title{margin-top:0}
  .np-build{grid-column:1 / -1}
}

/* ================= reduced motion ================= */
@media (prefers-reduced-motion:reduce){
  .np-root *,.np-root *::before,.np-root *::after{
    animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
}
`;
