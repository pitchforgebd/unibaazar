import { Text } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { splitRuns } from "@/lib/pdf/fonts";

/** Renders a string that may mix Latin/ASCII and Bengali characters (e.g.
 * "৳19,990") by splitting it into per-script runs, each with the font that
 * actually has its glyphs — see `src/lib/pdf/fonts.ts`. */
export function MixedText({ value, style }: { value: string; style?: Style }) {
  return (
    <Text style={style}>
      {splitRuns(value).map((run, index) => (
        <Text key={index} style={{ fontFamily: run.font }}>
          {run.text}
        </Text>
      ))}
    </Text>
  );
}
