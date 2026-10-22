import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="container ftr-grid">
        <div className="ftr-brand">
          <Logo />
          <p className="muted small">Revenda independente de iPhones novos e seminovos. Não somos loja oficial nem revenda autorizada da Apple. iPhone é marca registrada da Apple Inc.</p>
        </div>
        <div><h4>Loja</h4><Link to="/iphones">iPhones</Link><Link to="/seminovos">Seminovos</Link><Link to="/ofertas">Ofertas</Link><Link to="/comparar">Comparar</Link></div>
        <div><h4>Conta</h4><Link to="/conta">Meus pedidos</Link><Link to="/favoritos">Favoritos</Link><Link to="/carrinho">Carrinho</Link></div>
        <div><h4>Ajuda</h4><Link to="/sobre">Garantia e devolução</Link><Link to="/sobre">Privacidade</Link><Link to="/sobre">Termos de uso</Link><Link to="/admin">Painel do vendedor</Link></div>
      </div>
      <div className="container ftr-bottom muted small">© 2026 Argento · Projeto demonstrativo · Preços e estoque ilustrativos</div>
    </footer>
  )
}
