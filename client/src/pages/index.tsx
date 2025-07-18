// client/src/pages/index.tsx
import { Redirect } from "wouter";

// Este componente serve como uma rota "catch-all" ou raiz que foi depreciada.
// Ele simplesmente redireciona o usuário para a página de login, que é o
// ponto de entrada correto para a aplicação.
export default function RootRedirectPage() {
    return <Redirect to="/login" />;
}