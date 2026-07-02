DROP TRIGGER IF EXISTS trg_deal_cards_golden_hour ON public.deal_cards;
CREATE TRIGGER trg_deal_cards_golden_hour
BEFORE INSERT OR UPDATE OF golden_hour ON public.deal_cards
FOR EACH ROW EXECUTE FUNCTION public.set_golden_hour();

DROP TRIGGER IF EXISTS trg_deal_cards_updated_at ON public.deal_cards;
CREATE TRIGGER trg_deal_cards_updated_at
BEFORE UPDATE ON public.deal_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();