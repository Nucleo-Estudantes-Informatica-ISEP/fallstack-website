import "server-only";

import { findInterests } from "../repositories/interestRepository";

export const getInterests = () => findInterests();
