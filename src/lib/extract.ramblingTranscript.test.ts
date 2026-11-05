import { describe, it, expect } from "vitest";
import { extractCard, type ExtractionClient } from "./extract";
import { MessageCardSchema } from "./schema";

const RAMBLING_TRANSCRIPT = `
Hi there, yes hello, um, I am calling because, well, it is a bit of a long story actually.
So you see, I moved into this house about three years ago, maybe three and a half years,
and when I first moved in everything was fine, the boiler was working, the pipes were all okay,
the roof was in decent shape, and the garden, well, the garden needed work but that is beside the point.
Anyway, my name is David Hutchinson, and I have been meaning to call for a while actually,
I kept putting it off because I thought it might sort itself out, you know how it is,
you think well maybe the problem will just go away on its own and then six months pass and
here we are, the problem has definitely not gone away.
So the thing is, the boiler, it started making this noise about two months ago,
a sort of clanking sound, almost like someone is inside it with a wrench,
and my neighbour, she is very knowledgeable about these things, her husband used to be a plumber,
actually he retired about five years ago now, lovely man, always very helpful,
he would come round sometimes and have a look at things but unfortunately he passed away last winter
which was very sad, we all miss him very much, he used to grow vegetables in his garden, brilliant tomatoes.
But I digress, so the boiler is making this noise and I tried turning it off and on again,
I turned it off for about ten minutes, came back, turned it on, still the same noise,
and then I tried bleeding the radiators because someone on the internet said that can sometimes help,
and I bled the radiators in the dining room, the living room, the main bedroom, and the small bedroom,
and there was a bit of brown water which I assume is normal, the internet said it can be normal,
and after all that the radiators seem to be working fine actually, they are getting warm,
but the boiler is still making the noise, it is worse in the morning, sort of a clunk clunk clunk,
and then it settles down after about twenty minutes of running.
My wife thinks we should just get a new boiler entirely, she has been saying this for years honestly,
every winter she says we should replace it, it is about twelve years old now I think,
maybe thirteen, I would have to check the paperwork, I have all the original documentation somewhere,
it is in a box in the spare room, that room is absolutely full of boxes, we keep meaning to sort through them,
we moved some things from my mother's house when she downsized and it all ended up in that room.
She is doing very well by the way, she is eighty-two now and still very sharp, does the crossword every day.
Anyway I am getting off track again, the point is, I would like someone to come and have a look at the boiler,
just to assess whether it needs a repair or whether we should take my wife's advice and replace the whole thing.
We are not in a desperate rush, the heating is still working, just noisier than it should be,
but I would like to get it sorted before the really cold weather sets in, you know, before December ideally.
My number, I should have said this at the start, sorry about that, is 07911 223344.
That is oh seven nine one one, two two three three four four.
You can call me any time really, I am working from home at the moment so I am usually around,
except on Tuesday afternoons when I take my mother to her bridge club, that is every Tuesday from two till five,
so maybe avoid Tuesday afternoons if possible, but honestly any other time is fine.
I hope that all makes sense, I have gone on a bit, I know, sorry about that,
I just wanted to give you the full picture so that when you do come round you have some background.
Thanks very much for listening, I look forward to hearing from you, goodbye.
`
  .trim()
  .repeat(3);

describe("extractCard with a rambling transcript", () => {
  it("extracts a non-unknown reason and valid card from a 2000-word transcript", async () => {
    const expectedReason = "The caller's boiler is making a clanking noise and needs inspection.";
    const client: ExtractionClient = {
      async complete() {
        return {
          content: JSON.stringify({
            callerName: "David Hutchinson",
            callbackNumber: "07911223344",
            reason: expectedReason,
            urgency: "normal",
            suggestedReply:
              "Hi David, thanks for calling. I will be in touch to arrange a convenient time to inspect your boiler.",
            isSilentOrEmpty: false,
            extractionFailed: false,
          }),
        };
      },
    };

    const card = await extractCard(RAMBLING_TRANSCRIPT, null, client);

    expect(card.reason).not.toBe("unknown");
    expect(card.reason.length).toBeGreaterThan(0);

    const sentenceCount = (card.reason.match(/[.!?]+/g) ?? []).length;
    expect(sentenceCount).toBeLessThanOrEqual(2);

    const result = MessageCardSchema.safeParse(card);
    expect(result.success).toBe(true);
  });

  it("callback number is allowed because it appears in the transcript", async () => {
    const client: ExtractionClient = {
      async complete() {
        return {
          content: JSON.stringify({
            callerName: "David Hutchinson",
            callbackNumber: "07911223344",
            reason: "The caller's boiler is making a noise and needs a service.",
            urgency: "normal",
            suggestedReply: "I will call you back to arrange a visit.",
            isSilentOrEmpty: false,
            extractionFailed: false,
          }),
        };
      },
    };

    const card = await extractCard(RAMBLING_TRANSCRIPT, null, client);

    expect(card.callbackNumber).toBe("07911223344");
  });

  it("transcript word count exceeds 500 words", () => {
    const wordCount = RAMBLING_TRANSCRIPT.split(/\s+/).filter((w) => w.length > 0).length;
    expect(wordCount).toBeGreaterThan(500);
  });
});
