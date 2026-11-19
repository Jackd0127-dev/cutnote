/* Skill tile (Day 20): a white tile with the Claude mark, the skill's name and a small uppercase tag. */
VideoLibrary.register({
  id: "skill-tile",
  name: "Skill tile",
  category: "Cards",
  collection: "Clean cards",
  order: 3,
  source: "Day 20",
  description: "A white tile: the Claude spark, the skill's name in big type and a small uppercase \"Claude skill\" tag. Floats in with a slight tilt.",
  tags: ["claude", "skill", "tile", "icon", "ai"],
  duration: 3,
  params: [
    { key: "name", label: "Skill name", type: "text", default: "customer skill" },
    { key: "tag", label: "Tag", type: "text", default: "Claude skill" },
    { key: "inAt", label: "Tile lands (s)", type: "time", default: 0.1 },
    { key: "x", label: "Left edge (px)", type: "number", default: 260, min: 0, max: 1000 },
    { key: "y", label: "Top edge (px)", type: "number", default: 1300, min: 0, max: 1800 },
    { key: "width", label: "Width (px)", type: "number", default: 560, min: 300, max: 1040 },
  ],
  sfx: [{ file: "drop_002", at: "inAt" }],
  css: `
.vl-skill-tile .sk{position:absolute;display:flex;align-items:center;gap:26px;padding:32px 38px;border-radius:36px;background:rgba(255,255,255,.97);color:#17120e;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0}
.vl-skill-tile .sk svg{flex:none;width:74px;height:74px;fill:#D97757}
.vl-skill-tile .tx{display:flex;flex-direction:column;gap:8px;min-width:0}
.vl-skill-tile .nm{font-family:"ArchivoXB";font-size:48px;letter-spacing:-.03em;line-height:1;white-space:nowrap}
.vl-skill-tile .tg{font-family:"Typewriter";font-size:24px;letter-spacing:.16em;text-transform:uppercase;opacity:.55}`,
  html(p, c) {
    return `<div class="sk" id="${c.id("t")}" style="left:${p.x}px;top:${p.y}px;width:${p.width}px"><svg viewBox="0 0 24 24"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg><div class="tx"><span class="nm">${c.esc(p.name)}</span><span class="tg">${c.esc(p.tag)}</span></div></div>`;
  },
  animate(tl, p, c) {
    const a = p.inAt == null || p.inAt === "" ? 0.1 : +p.inAt, id = "#" + c.id("t");
    tl.fromTo(id, { opacity: 0, y: 50, scale: 0.82, rotation: 6 }, { opacity: 1, y: 0, scale: 1, rotation: -1, duration: 0.5, ease: "back.out(1.6)" }, c.at(a));
    c.exit(tl, id);
  },
});
