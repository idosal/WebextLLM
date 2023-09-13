/**
 * A universal tokenizer that is backed by either
 * HF tokenizers rust library or sentencepiece
 */
export declare class Tokenizer {
    private handle;
    private constructor();
    /**
     * Dispose this tokenizer.
     *
     * Call this function when we no longer needs to
     */
    dispose(): void;
    /**
     * Encode text to token ids.
     *
     * @param text Input text.
     * @returns The output tokens
     */
    encode(text: string): Int32Array;
    /**
     * Decode the token ids into string.
     *
     * @param ids the input ids.
     * @returns The decoded string.
     */
    decode(ids: Int32Array): string;
    /**
     * Create a tokenizer from jsonArrayBuffer
     *
     * @param json The input array buffer that contains json text.
     * @returns The tokenizer
     */
    static fromJSON(json: ArrayBuffer): Promise<Tokenizer>;
    /**
     * Create a tokenizer from byte-level BPE blobs.
     *
     * @param vocab The vocab blob.
     * @param merges The merges blob.
     * @param addedTokens The addedTokens blob
     * @returns The tokenizer
     */
    static fromByteLevelBPE(vocab: ArrayBuffer, merges: ArrayBuffer, addedTokens?: string): Promise<Tokenizer>;
    /**
     * Create a tokenizer from sentencepiece model.
     *
     * @param model The model blob.
     * @returns The tokenizer
     */
    static fromSentencePiece(model: ArrayBuffer): Promise<Tokenizer>;
}
//# sourceMappingURL=tokenizers.d.ts.map