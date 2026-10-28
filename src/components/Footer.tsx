import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Logo } from './Logo'
import Contato from './Contato'
import { useStore } from '../store/Store'

export default function Footer() {
  const { features } = useStore()
  return (
    <footer className="ftr">
      <div className="container ftr-grid">
        <div className="ftr-brand">
          <Logo />
          <p className="muted small">Revenda independente de iPhones novos e seminovos. Não somos loja oficial nem revenda autorizada da Apple. iPhone é marca registrada da Apple Inc.</p>
        </div>
        <div><h4>Loja</h4><Link to="/iphones">iPhones</Link><Link to="/seminovos">Seminovos</Link><Link to="/ofertas">Ofertas</Link><Link to="/comparar">Comparar</Link></div>
        <div><h4>Conta</h4>{features.checkout && <Link to="/conta">Meus pedidos</Link>}<Link to="/favoritos">Favoritos</Link><Link to="/comparar">Comparar</Link>{features.cart && <Link to="/carrinho">Carrinho</Link>}</div>
        {/* O contato geral da loja mora aqui, e não ao lado do produto: aqui ele serve dúvida de garantia,
            troca e pagamento, sem competir com o botão de interesse na página do aparelho. */}
        <div><h4>Ajuda</h4><Link to="/sobre">Garantia e devolução</Link><Link to="/sobre">Privacidade</Link><Link to="/sobre">Termos de uso</Link>{features.whatsappContact && <Contato tipo="loja" classe="ftr-contato"><MessageCircle size={14} /> Falar com a loja</Contato>}<Link to="/admin">Painel do vendedor</Link></div>
      </div>
      <div className="container ftr-bottom muted small">© 2026 Argento · Projeto demonstrativo · Preços e estoque ilustrativos</div>
    </footer>
  )
}
