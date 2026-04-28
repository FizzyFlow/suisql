import { describe, expect, it } from "vitest";
import { compress, decompress } from "../src/SuiSqlUtils";
import crypto from 'crypto';

describe("compress and back", () => {
    it("basic compression test", async () => {
        const dataString = `Moome ipsum dolor sit amet, liquid staking consectetur adipiscing elit. Sed meme-token magna, eget tincidunt arcu dapibus at. Nulla facilisi—collateral in MoomeBank depositus, pretium per Turbos mutabilis est. Nam at semper turpis, eget dapibus arcu.`;

        const bytes = (new TextEncoder()).encode(dataString);
        const compressed = await compress(bytes);

        expect(compressed.length < bytes.length).toBeTruthy();

        const decompressed = await decompress(compressed);

        expect(decompressed.length == bytes.length).toBeTruthy();

        const restored = (new TextDecoder()).decode(decompressed);

        expect(restored == dataString).toBeTruthy();
        expect(restored.length).toEqual(dataString.length);
    });
});