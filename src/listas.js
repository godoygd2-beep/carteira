/* Listas para o autocompletar.
   Ações, FIIs e Tesouro vêm do robô (dados/ativos.json, lista completa da B3 e títulos do Tesouro).
   Abaixo, uma reserva caso a lista ainda não tenha carregado, e as criptomoedas. */
export const CRIPTO = [['BTC', 'Bitcoin'], ['ETH', 'Ethereum'], ['USDT', 'Tether (dólar digital)'], ['USDC', 'USD Coin'], ['SOL', 'Solana'], ['BNB', 'BNB'], ['XRP', 'XRP'],
  ['ADA', 'Cardano'], ['DOGE', 'Dogecoin'], ['LINK', 'Chainlink'], ['AVAX', 'Avalanche'], ['DOT', 'Polkadot'], ['LTC', 'Litecoin'], ['TRX', 'TRON'], ['TON', 'Toncoin'],
  ['SUI', 'Sui'], ['POL', 'Polygon'], ['SHIB', 'Shiba Inu'], ['PEPE', 'Pepe'], ['NEAR', 'NEAR Protocol'], ['APT', 'Aptos'], ['ARB', 'Arbitrum'], ['OP', 'Optimism'],
  ['ATOM', 'Cosmos'], ['UNI', 'Uniswap'], ['AAVE', 'Aave'], ['RENDER', 'Render'], ['FET', 'Artificial Superintelligence'], ['HBAR', 'Hedera'], ['XLM', 'Stellar'], ['BCH', 'Bitcoin Cash'], ['ETC', 'Ethereum Classic']];

export const RESERVA = {
  acao: [['PETR4', 'Petrobras PN'], ['PETR3', 'Petrobras ON'], ['VALE3', 'Vale'], ['ITUB4', 'Itaú Unibanco PN'], ['BBDC4', 'Bradesco PN'], ['BBAS3', 'Banco do Brasil'], ['ITSA4', 'Itaúsa PN'],
    ['ABEV3', 'Ambev'], ['WEGE3', 'WEG'], ['B3SA3', 'B3'], ['BBSE3', 'BB Seguridade'], ['TAEE11', 'Taesa'], ['EGIE3', 'Engie Brasil'], ['CMIG4', 'Cemig PN'], ['SBSP3', 'Sabesp'],
    ['SANB11', 'Santander Brasil'], ['BPAC11', 'BTG Pactual'], ['SUZB3', 'Suzano'], ['KLBN11', 'Klabin'], ['GGBR4', 'Gerdau PN'], ['PRIO3', 'PRIO'], ['VBBR3', 'Vibra Energia'],
    ['MGLU3', 'Magazine Luiza'], ['LREN3', 'Lojas Renner'], ['RADL3', 'Raia Drogasil'], ['RENT3', 'Localiza'], ['VIVT3', 'Telefônica Vivo'], ['TIMS3', 'TIM'], ['EMBR3', 'Embraer']],
  fii: [['MXRF11', 'Maxi Renda'], ['HGLG11', 'Logística'], ['KNCR11', 'Kinea Rendimentos Imobiliários'], ['KNRI11', 'Kinea Renda Imobiliária'], ['KNIP11', 'Kinea Índices de Preços'],
    ['XPML11', 'XP Malls'], ['XPLG11', 'XP Log'], ['VISC11', 'Vinci Shopping Centers'], ['BTLG11', 'BTG Logística'], ['CPTS11', 'Capitânia Securities'], ['IRDM11', 'Iridium Recebíveis'],
    ['RECR11', 'REC Recebíveis'], ['VGHF11', 'Valora Hedge Fund'], ['MCCI11', 'Mauá Capital Recebíveis'], ['HGBS11', 'Hedge Brasil Shopping'], ['TGAR11', 'TG Ativo Real'], ['PVBI11', 'VBI Prime Properties']],
  tesouro: [['Tesouro Selic 2029', ''], ['Tesouro Selic 2031', ''], ['Tesouro Prefixado 2029', ''], ['Tesouro Prefixado 2032', ''], ['Tesouro IPCA+ 2029', ''], ['Tesouro IPCA+ 2035', ''],
    ['Tesouro IPCA+ 2045', ''], ['Tesouro IPCA+ com Juros Semestrais 2035', ''], ['Tesouro RendA+ 2065', ''], ['Tesouro Educa+ 2035', '']]
};
