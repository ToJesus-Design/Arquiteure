import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section className="card">
        <h1>Arquiteure</h1>
        <p>
          Plataforma autoevolutiva de arquitetura, engenharia e planeamento urbano
          focada no enquadramento legal português. Cria projetos, descreve
          intenções por texto, voz ou fotografia e recebe alternativas
          validadas contra o RGEU, RJUE, DL 163/2006 e regulamentos municipais.
        </p>
        <p>
          <Link href="/projects" className="btn">Ver projetos</Link>{" "}
          <Link href="/projects/new" className="btn secondary">Criar projeto</Link>
        </p>
      </section>
      <section className="card">
        <h2>Princípios</h2>
        <ul>
          <li>Nenhuma decisão é marcada como definitiva sem aprovação humana.</li>
          <li>Cada escolha cita a regra técnica/legal aplicada.</li>
          <li>Versões imutáveis — todas as alterações criam nova iteração.</li>
          <li>Base de conhecimento atualizada automaticamente sobre fontes oficiais.</li>
        </ul>
      </section>
    </div>
  );
}
