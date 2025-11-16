import { FunctionComponent } from "react";

import { Sponsors } from "../../utils/Sponsors";
import SponsorsContainer from "../SponsorsContainer";

const SponsorsSection: FunctionComponent = () => {
  return (
     <section className="bg-background border-b-secondary flex flex-col items-center gap-y-10 border-b text-center">
      <SponsorsContainer sponsors={Sponsors} />
    </section>
  );
};

export default SponsorsSection;
