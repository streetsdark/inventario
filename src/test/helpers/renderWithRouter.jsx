import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Wrapper de render que envuelve el componente en un MemoryRouter.
 * Útil para componentes que usan <Link> o useNavigate.
 */
export function renderWithRouter(ui, { initialEntries = ["/"] } = {}) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}
