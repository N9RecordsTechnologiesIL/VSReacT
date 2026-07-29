#include <vsreact/vsreact.h>

#include <iostream>

// Measures the DirtyDelay knob shader's cost in the REAL QuickJS runtime — the
// gate that decides live canvas shading vs a baked film-strip for the port.
// Not a correctness assertion; it logs ms and holds only a loose ceiling so CI
// never flakes on a slow machine.
class KnobShaderBench final : public juce::UnitTest
{
public:
    KnobShaderBench() : juce::UnitTest ("vsreact::KnobShaderBench") {}

    void runTest() override
    {
        beginTest ("shade 4 knobs at 240x240 in QuickJS");
        {
            double ms = 0.0;

            vsreact::JsRuntime::Callbacks cbs;
            cbs.onLog = [&] (const juce::String&, const juce::String& m) { ms = m.getDoubleValue(); };

            vsreact::JsRuntime js { cbs };

            // The shader hot loop, faithful to knobLighting.ts. One full repaint
            // = 4 knobs * 240 * 240 samples. Logs milliseconds per repaint,
            // averaged over 5 iterations.
            const juce::String src = R"JS(
              const clamp = (v, lo=0, hi=1) => Math.min(hi, Math.max(lo, v));
              const norm = (x,y,z) => { const l = Math.hypot(x,y,z)||1; return {x:x/l,y:y/l,z:z/l}; };
              const L = norm(-0.46,-0.62,0.74);
              const V = norm(0,0,1);
              const H = norm(L.x+V.x, L.y+V.y, L.z+V.z);
              const rot = (x,y,r) => ({x:x*Math.cos(r)-y*Math.sin(r), y:x*Math.sin(r)+y*Math.cos(r)});
              const indDist = (x,y) => { const cy = clamp(y,-0.78,-0.25); return Math.hypot(x, y-cy); };
              function shade(deg, x, y) {
                const radius = Math.hypot(x,y); if (radius > 1) return 0;
                const r = deg*(Math.PI/180); const op = rot(x,y,-r);
                const mat = indDist(op.x,op.y) < 0.062 ? 1 : 0;
                const dx=x*0.36, dy=y*0.36, dz=Math.sqrt(Math.max(0.001,1-dx*dx-dy*dy));
                const oa=Math.atan2(op.y,op.x);
                const ba=op.x*0.82+op.y*0.37, ca=-op.x*0.37+op.y*0.82;
                const brush=Math.sin(ba*126+Math.sin(ca*19)*1.8)*0.052;
                const scr=Math.sin((op.x*0.19-op.y)*233)*0.018;
                const fl=Math.sin(oa*17+radius*13)*0.035;
                const tx=-Math.sin(oa), ty=Math.cos(oa);
                let nx=brush*0.82+scr*0.22+tx*fl, ny=brush*0.37-scr+ty*fl;
                if (mat) { const ridge=clamp(op.x/0.062,-1,1); const eb=op.y<-0.78?-(op.y+0.78)/0.062:0; nx+=ridge*0.42; ny+=eb*0.24-0.08; }
                const wp=rot(nx,ny,r);
                const n=norm(dx+wp.x, dy+wp.y, dz);
                const sn=norm(dx,dy,dz);
                const diff=clamp(n.x*L.x+n.y*L.y+n.z*L.z);
                const hd=clamp(n.x*H.x+n.y*H.y+n.z*H.z);
                const shd=clamp(sn.x*H.x+sn.y*H.y+sn.z*H.z);
                const eo=clamp((1-radius)/0.18);
                const ani=0.48+0.52*Math.abs(Math.cos(oa*2.1+ba*9));
                const isp=Math.pow(hd,52)*1.45*ani;
                const ban=0.35+0.65*Math.pow(0.5+0.5*Math.cos(oa*2+0.4),2);
                const csp=Math.pow(shd,14)*0.24*ban;
                const spec=mat?isp:csp;
                const fr=Math.pow(1-clamp(n.z),3)*0.52;
                const amb=0.045+eo*0.065;
                const mg=Math.sin(ba*214+Math.sin(ca*31))*0.018;
                const ill=amb+diff*0.42+spec+fr;
                return ill+mg+spec; // enough to prevent dead-code elimination
              }
              function frame() {
                const size=240; let acc=0;
                for (let k=0;k<4;k++)
                  for (let py=0;py<size;py++) { const y=((py+0.5)/size)*2-1;
                    for (let px=0;px<size;px++) { const x=((px+0.5)/size)*2-1; acc+=shade(k*30, x, y); } }
                return acc;
              }
              frame(); // warm
              const t0 = Date.now(); let s=0;
              for (let i=0;i<5;i++) s+=frame();
              __vsreact_log('log', String((Date.now()-t0)/5));
              if (!isFinite(s)) throw new Error('nan');
            )JS";

            expect (js.evaluate (src, "bench.js"));

            // stdout, not logMessage: the runner only prints messages for
            // failing tests, and this number is the whole point of the bench.
            std::cout << "BENCH knob shader (faithful, allocating): "
                      << juce::String (ms, 2)
                      << " ms per 4-knob 240x240 repaint (QuickJS)" << std::endl;
            expect (ms > 0.0);
        }

        beginTest ("allocation-free scalar rewrite, one 180x180 knob");
        {
            // The faithful port allocates ~5 objects per sample (norm/rot return
            // objects) — ~1.15M allocations per 4-knob frame. This variant is
            // the same math with every vector inlined as scalars, sized to ONE
            // knob at its real size (90px CSS x 2 DPI), which is what actually
            // redraws during a drag. It isolates allocation cost from FP cost.
            double ms = 0.0;

            vsreact::JsRuntime::Callbacks cbs;
            cbs.onLog = [&] (const juce::String&, const juce::String& m) { ms = m.getDoubleValue(); };

            vsreact::JsRuntime js { cbs };

            const juce::String src = R"JS(
              const LX=-0.46/1.0, LY=-0.62, LZ=0.74;
              const ll=Math.hypot(LX,LY,LZ);
              const lx=LX/ll, ly=LY/ll, lz=LZ/ll;
              let hx=lx+0, hy=ly+0, hz=lz+1;
              const hl=Math.hypot(hx,hy,hz); hx/=hl; hy/=hl; hz/=hl;
              function frame(deg, size) {
                const r=deg*(Math.PI/180), cs=Math.cos(r), sn=Math.sin(r);
                const csn=Math.cos(-r), snn=Math.sin(-r);
                let acc=0;
                for (let py=0;py<size;py++) {
                  const y=((py+0.5)/size)*2-1;
                  for (let px=0;px<size;px++) {
                    const x=((px+0.5)/size)*2-1;
                    const radius=Math.hypot(x,y); if (radius>1) continue;
                    const opx=x*csn-y*snn, opy=x*snn+y*csn;
                    const cy=opy<-0.78?-0.78:(opy>-0.25?-0.25:opy);
                    const mat=Math.hypot(opx,opy-cy)<0.062?1:0;
                    const dx=x*0.36, dy=y*0.36;
                    const dz=Math.sqrt(Math.max(0.001,1-dx*dx-dy*dy));
                    const oa=Math.atan2(opy,opx);
                    const ba=opx*0.82+opy*0.37, ca=-opx*0.37+opy*0.82;
                    const brush=Math.sin(ba*126+Math.sin(ca*19)*1.8)*0.052;
                    const scr=Math.sin((opx*0.19-opy)*233)*0.018;
                    const fl=Math.sin(oa*17+radius*13)*0.035;
                    let nx=brush*0.82+scr*0.22+(-Math.sin(oa))*fl;
                    let ny=brush*0.37-scr+Math.cos(oa)*fl;
                    if (mat) {
                      const ridge=opx/0.062<-1?-1:(opx/0.062>1?1:opx/0.062);
                      const eb=opy<-0.78?-(opy+0.78)/0.062:0;
                      nx+=ridge*0.42; ny+=eb*0.24-0.08;
                    }
                    const wx=nx*cs-ny*sn, wy=nx*sn+ny*cs;
                    let px2=dx+wx, py2=dy+wy, pz2=dz;
                    const pl=Math.hypot(px2,py2,pz2)||1; px2/=pl; py2/=pl; pz2/=pl;
                    const sl=Math.hypot(dx,dy,dz)||1;
                    const sx=dx/sl, sy=dy/sl, sz=dz/sl;
                    let diff=px2*lx+py2*ly+pz2*lz; diff=diff<0?0:(diff>1?1:diff);
                    let hd=px2*hx+py2*hy+pz2*hz; hd=hd<0?0:(hd>1?1:hd);
                    let shd=sx*hx+sy*hy+sz*hz; shd=shd<0?0:(shd>1?1:shd);
                    let eo=(1-radius)/0.18; eo=eo<0?0:(eo>1?1:eo);
                    const ani=0.48+0.52*Math.abs(Math.cos(oa*2.1+ba*9));
                    const ban=0.35+0.65*Math.pow(0.5+0.5*Math.cos(oa*2+0.4),2);
                    const spec=mat?Math.pow(hd,52)*1.45*ani:Math.pow(shd,14)*0.24*ban;
                    const fr=Math.pow(1-(pz2<0?0:(pz2>1?1:pz2)),3)*0.52;
                    const mg=Math.sin(ba*214+Math.sin(ca*31))*0.018;
                    acc+=0.045+eo*0.065+diff*0.42+spec+fr+mg;
                  }
                }
                return acc;
              }
              frame(0,180); // warm
              const t0=Date.now(); let s=0;
              for (let i=0;i<5;i++) s+=frame(i*20,180);
              __vsreact_log('log', String((Date.now()-t0)/5));
              if (!isFinite(s)) throw new Error('nan');
            )JS";

            expect (js.evaluate (src, "bench2.js"));
            std::cout << "BENCH knob shader (scalar, 1 knob @180x180): "
                      << juce::String (ms, 2) << " ms per redraw (QuickJS)" << std::endl;
            expect (ms > 0.0);
        }
    }
};

static KnobShaderBench knobShaderBench;
