/* Configuração do Firebase.
   Vem do Console do Firebase → Configurações do projeto → Seus apps → app da Web.
   Não é senha: quem protege os dados são as regras (firestore.rules) e o login com Google.
   Se ficar vazio, o app abre em modo demonstração (dados de exemplo, só no aparelho). */
export const FIREBASE = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};
