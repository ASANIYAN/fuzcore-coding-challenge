import { listSupportedCurrencies } from "../../lib/currency";

export class CurrenciesService {
  listCurrencies() {
    return listSupportedCurrencies();
  }
}
