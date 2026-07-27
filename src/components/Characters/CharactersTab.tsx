import React from 'react';
import { CharacterHub } from '../CharacterHub';
import { InfinityStones } from '../InfinityStones';

interface CharactersTabProps {
  handleSelectMovieId: (id: string) => void;
}

export function CharactersTab({ handleSelectMovieId }: CharactersTabProps) {
  return (
    <>
      {/* Characters Tracker view components */}
      <CharacterHub onSelectMovie={handleSelectMovieId} />

      {/* Infinity Stones Tracker */}
      <InfinityStones onSelectMovie={handleSelectMovieId} />
    </>
  );
}
