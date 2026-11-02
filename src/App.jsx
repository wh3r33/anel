import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import Lenis from 'lenis';
import * as THREE from 'three';

const MODEL_PATH = '/house-pbr.glb';

const services = [
  ['01', 'Архитектура', 'Эскиз, планировки, чертежи и помощь на стройке. Ведём проект от первой встречи до последнего решения.'],
  ['02', 'Интерьеры', 'Подбираем материалы, свет и мебель вместе, чтобы дом был цельным и удобным, а не похожим на каталог.'],
  ['03', 'Визуализация', 'Показываем будущий дом до стройки. Можно заранее увидеть его утром, вечером и в обычный пасмурный день.'],
];

const projects = [
  { type: 'art-one', label: 'РАКУРС / 01', title: 'Дом со стороны участка', meta: 'Общий вид', angle: [0.02, 0.42, 0], camera: [4.3, 1.85, 5.2], scale: 4.9 },
  { type: 'art-two', label: 'РАКУРС / 02', title: 'Вход и дневной свет', meta: 'Боковой фасад', angle: [0, -0.82, 0], camera: [-3.2, 2.45, 4.25], scale: 5.8 },
  { type: 'art-three', label: 'РАКУРС / 03', title: 'Дом со стороны сада', meta: 'Задний фасад', angle: [0.04, 2.72, 0], camera: [3.2, 1.45, 4.55], scale: 5.45 },
];

const detailProject = { ...projects[0], angle: [0.03, -0.2, 0], camera: [3.7, 1.5, 4.8], scale: 4.9 };

const deliverables = [
  ['01', 'Планировочные решения', 'Понимаете, где будет кухня, спальня, вход и место для всего, что важно именно вам.'],
  ['02', 'Фасады и разрезы', 'Видите дом целиком: высоты, окна, материалы и то, как он садится на участок.'],
  ['03', 'Рабочие чертежи', 'Получаете комплект, с которым можно говорить со строителями на одном языке.'],
  ['04', '3D-визуализация', 'Проверяете решения заранее, до закупок и необратимых работ на стройке.'],
];

const faq = [
  ['С чего начать?', 'Напишите, что у вас уже есть: участок, готовый проект или только идея. На первой встрече разберём вводные и поймём, какой следующий шаг нужен.'],
  ['Что входит в архитектурный проект?', 'Состав зависит от задачи. Обычно это планировки, фасады, разрезы, узлы и материалы, которые нужны для согласования и стройки.'],
  ['Можно заказать только чертежи?', 'Да. Подключимся на нужном этапе: проверим планировку, доработаем эскиз или подготовим комплект рабочих чертежей.'],
  ['Вы помогаете во время строительства?', 'Да, можем сопровождать стройку и отвечать на вопросы подрядчиков, чтобы решения из проекта не потерялись на месте.'],
];

function normalizeModel(model, targetSize = 3.9) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale + 0.05, -center.z * scale);
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      material.needsUpdate = true;
    });
  });
}

function SiteHeader({ menuOpen, onToggle }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="FORMA, на главную">
        <span className="brand-mark">F/</span>
        <span>FORMA</span>
      </a>
      <nav className="desktop-nav" aria-label="Основная навигация">
        <a href="#services">Услуги</a>
        <a href="#projects">Проекты</a>
        <a href="#studio">Студия</a>
      </nav>
      <a className="header-cta" href="#contact">Обсудить проект <span>↗</span></a>
      <button className={`menu-toggle ${menuOpen ? 'is-open' : ''}`} type="button" aria-label="Открыть меню" aria-expanded={menuOpen} onClick={onToggle}>
        <span /><span />
      </button>
    </header>
  );
}

function MobileMenu({ open, onClose }) {
  return (
    <div className={`mobile-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      {['Услуги', 'Проекты', 'Студия'].map((item) => (
        <a key={item} href={`#${item === 'Услуги' ? 'services' : item === 'Проекты' ? 'projects' : 'studio'}`} onClick={onClose}>{item}</a>
      ))}
      <a href="#contact" onClick={onClose}>Обсудить проект ↗</a>
    </div>
  );
}

function HouseModel({ onReady, scrollProgress }) {
  const group = useRef();
  const { scene: source } = useGLTF(MODEL_PATH);
  const { camera } = useThree();
  const model = useMemo(() => source.clone(true), [source]);
  const progress = useRef(0);
  const introProgress = useRef(0);

  useEffect(() => {
    normalizeModel(model);
    group.current.rotation.y = 0;
    onReady();
  }, [model, onReady]);

  useFrame((_, delta) => {
    introProgress.current = THREE.MathUtils.damp(introProgress.current, 1, 2.4, delta);
    const introEase = 1 - Math.pow(1 - introProgress.current, 4);
    progress.current = THREE.MathUtils.damp(progress.current, scrollProgress.current, 5.2, delta);
    group.current.position.x = THREE.MathUtils.lerp(2.4, 1.05, introEase);
    group.current.position.y = THREE.MathUtils.lerp(-0.8, -0.12, introEase);
    group.current.position.z = THREE.MathUtils.lerp(-2.6, 0, introEase);
    group.current.scale.setScalar(THREE.MathUtils.lerp(0.46, 1, introEase));
    group.current.rotation.z = THREE.MathUtils.lerp(-0.08, 0, introEase);
    group.current.rotation.y = -progress.current * Math.PI * 2;
    group.current.rotation.x = Math.sin(progress.current * Math.PI) * 0.035;
  });

  camera.position.set(0, 1.15, 7.8);
  camera.lookAt(0, 0, 0);
  return <group ref={group}><primitive object={model} /></group>;
}

function StaticHouseModel({ project }) {
  const { scene: source } = useGLTF(MODEL_PATH);
  const { camera } = useThree();
  const model = useMemo(() => source.clone(true), [source]);

  useEffect(() => {
    normalizeModel(model, project.scale);
    model.rotation.set(...project.angle);
    camera.position.set(...project.camera);
    camera.lookAt(0, 0.1, 0);
    camera.updateProjectionMatrix();
  }, [camera, model, project]);

  return <primitive object={model} />;
}

function ProjectModel({ project }) {
  return (
    <Canvas
      className="project-model-canvas"
      frameloop="demand"
      camera={{ fov: 29, near: 0.1, far: 1000, position: project.camera }}
      dpr={[1, 1.35]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <hemisphereLight args={[0xe8e6d8, 0x111111, 2.2]} />
      <directionalLight position={[4, 7, 6]} intensity={4.3} />
      <directionalLight position={[-5, 2, -4]} intensity={1.15} color="#a6b5ff" />
      <Suspense fallback={null}>
        <StaticHouseModel project={project} />
      </Suspense>
    </Canvas>
  );
}

function ModelCanvas({ onReady, scrollProgress }) {
  return (
    <Canvas id="model-canvas" camera={{ fov: 28, near: 0.1, far: 1000 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.15;
    }}>
      <hemisphereLight args={[0xe8e6d8, 0x111111, 2.5]} />
      <directionalLight position={[4, 7, 6]} intensity={4.5} />
      <directionalLight position={[-5, 2, -4]} intensity={1.2} color="#a6b5ff" />
      <Suspense fallback={null}>
        <HouseModel onReady={onReady} scrollProgress={scrollProgress} />
      </Suspense>
    </Canvas>
  );
}

function Hero({ scrollProgress }) {
  const [status, setStatus] = useState('loading');
  const ready = useCallback(() => setStatus('ready'), []);
  return (
    <section className="hero-scene" aria-label="Интерактивная 3D-модель дома">
      <div className="hero-sticky">
        <div className="hero-copy">
          <p className="eyebrow">FORMA / архитектура частных домов</p>
          <h1>Дом начинается<br /><em>с вашей жизни.</em></h1>
          <p className="hero-description">Разбираемся с участком, светом и вашими привычками, а потом переводим это в планировки и чертежи.</p>
          <a className="text-link" href="#services">Как мы работаем <span>↓</span></a>
        </div>
        <div className="model-wrap" aria-hidden="true">
          <div className="model-meta model-meta-top"><span>01</span><span>LIVE MODEL</span></div>
          <ModelCanvas onReady={ready} scrollProgress={scrollProgress} />
          <div className={`model-status ${status === 'ready' ? 'is-ready' : ''}`}><span />Загрузка модели</div>
          <div className="model-meta model-meta-bottom"><span>SCROLL TO ROTATE</span><span>360°</span></div>
        </div>
        <div className="hero-footer"><span>↓ Прокрутите, чтобы исследовать</span><span>FORMA / 2026</span></div>
      </div>
    </section>
  );
}

function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add('is-visible');
        observer.unobserve(node);
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

function StudioSection() {
  return <section className="statement section-pad" id="studio"><div className="section-index">01 / О студии</div><Reveal className="statement-content"><h2>Мы проектируем место для обычных дней.</h2><p>Смотрим, как начинается утро, где собирается семья и что вы видите из окна. Из таких деталей растёт планировка.</p></Reveal></section>;
}

function ServicesSection() {
  return <section className="services section-pad" id="services"><div className="section-heading"><div className="section-index">02 / Услуги</div><h2>Разбираемся<br />и рисуем.</h2></div><div className="service-list">{services.map(([number, title, description]) => <article className="service-row" key={number}><span className="service-number">{number}</span><h3>{title}</h3><p>{description}</p><span className="service-arrow">↗</span></article>)}</div></section>;
}

function DeliverablesSection() {
  return <section className="deliverables section-pad"><div className="deliverables-heading"><div className="section-index">03 / Результат</div><h2>На выходе у вас<br /><em>понятный проект.</em></h2><p>Не набор красивых картинок, а решения, которые можно обсуждать, считать и строить.</p></div><div className="deliverables-list">{deliverables.map(([number, title, description]) => <article className="deliverable-row" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><b>↗</b></article>)}</div></section>;
}

function ProjectsSection() {
  return <section className="projects section-pad" id="projects"><div className="projects-heading"><div className="section-index">04 / Модель дома</div><h2>Один проект.<br /><em>Три точки зрения.</em></h2><a className="text-link" href="#contact">Обсудить проект <span>↗</span></a></div><div className="project-grid">{projects.map((project, index) => <article className={`project-card ${index === 0 ? 'project-card-large' : ''} ${index === 2 ? 'project-card-offset' : ''}`} key={project.label}><div className={`project-art ${project.type}`}><ProjectModel project={project} /><span className="art-label">{project.label}</span></div><div className="project-info"><h3>{project.title}</h3><span>{project.meta}</span></div></article>)}</div></section>;
}

function DetailSection() {
  return <section className="detail section-pad"><div className="detail-heading"><div className="section-index">05 / В деталях</div><h2>Дом меняется,<br /><em>когда меняется свет.</em></h2></div><div className="detail-layout"><div className="detail-model"><ProjectModel project={detailProject} /><span>ФИКСИРОВАННЫЙ РАКУРС / 01</span></div><div className="detail-notes"><article><span>01</span><div><h3>Участок</h3><p>Дом не спорит с рельефом. Вход, окна и открытые зоны собраны вокруг того, что уже есть на месте.</p></div></article><article><span>02</span><div><h3>Свет</h3><p>Утренний свет для общих пространств, более спокойный сценарий для комнат и тень там, где она нужна летом.</p></div></article><article><span>03</span><div><h3>Материалы</h3><p>Камень, дерево и штукатурка дают дому спокойный фон, который не устаревает через сезон.</p></div></article></div></div></section>;
}

function ProcessSection() {
  return <section className="process section-pad"><div className="section-index">06 / Процесс</div><div className="process-layout"><h2>Сначала узнаём,<br />как вы живёте.</h2><div className="process-steps"><div><span>01</span><h3>Приезжаем и смотрим</h3><p>Участок, солнце, соседей, подъезд и виды из окон.</p></div><div><span>02</span><h3>Обсуждаем</h3><p>Что должно быть в доме, а без чего можно обойтись.</p></div><div><span>03</span><h3>Рисуем и ведём</h3><p>Делаем чертежи и помогаем принять решения на стройке.</p></div></div></div></section>;
}

function FAQSection() {
  return <section className="faq section-pad"><div className="faq-layout"><div><div className="section-index">07 / Вопросы</div><h2>Если коротко,<br /><em>спросите.</em></h2></div><div className="faq-list">{faq.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}</div></div></section>;
}

function ContactSection() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', message: '' });
  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submitForm = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Новый проект: ${form.name}`);
    const body = encodeURIComponent(`Имя: ${form.name}\nКонтакт: ${form.contact}\n\nЗадача:\n${form.message}`);
    window.location.href = `mailto:hello@forma.studio?subject=${subject}&body=${body}`;
    setSent(true);
  };
  return <section className="contact section-pad" id="contact"><div className="contact-mark">F/</div><div className="contact-content"><div className="section-index">08 / Поговорим</div><h2>Есть участок<br /><em>или только идея?</em></h2><p className="contact-note">Оставьте пару слов о задаче. Ответим и предложим, с чего лучше начать.</p><form className="contact-form" onSubmit={submitForm}><label><span>Имя</span><input name="name" value={form.name} onChange={updateField} required /></label><label><span>Телефон или email</span><input name="contact" value={form.contact} onChange={updateField} required /></label><label><span>Что планируете?</span><textarea name="message" rows="4" value={form.message} onChange={updateField} required /></label><button type="submit">Обсудить проект <span>↗</span></button>{sent && <p className="form-status" role="status">Почтовое приложение откроется с готовым письмом.</p>}</form></div><div className="contact-footer"><span>© FORMA STUDIO</span><span>Алматы / Казахстан</span><span>Архитектура частных домов</span></div></section>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollProgress = useRef(0);
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });
    const heroScene = document.querySelector('.hero-scene');
    const updateProgress = ({ scroll }) => {
      if (!heroScene) return;
      const distance = Math.max(heroScene.offsetHeight - window.innerHeight, 1);
      scrollProgress.current = Math.min(Math.max((scroll - heroScene.offsetTop) / distance, 0), 1);
    };
    lenis.on('scroll', updateProgress);
    let frame;
    const raf = (time) => { lenis.raf(time); frame = requestAnimationFrame(raf); };
    frame = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(frame); lenis.off('scroll', updateProgress); lenis.destroy(); };
  }, []);
  return <div className="site-shell"><SiteHeader menuOpen={menuOpen} onToggle={() => setMenuOpen((open) => !open)} /><MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} /><main id="top"><Hero scrollProgress={scrollProgress} /><StudioSection /><ServicesSection /><DeliverablesSection /><ProjectsSection /><DetailSection /><ProcessSection /><FAQSection /><ContactSection /></main></div>;
}

useGLTF.preload(MODEL_PATH);

export default App;
