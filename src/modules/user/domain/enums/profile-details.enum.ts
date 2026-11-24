export enum Gender {
  FEMALE = 'FEMALE',
  MALE = 'MALE',
  NON_BINARY = 'NON_BINARY',
  UNDISCLOSED = 'UNDISCLOSED',
}

export enum PreferredHousingType {
  REPUBLIC = 'REPUBLIC',
  ROOM = 'ROOM',
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  KITNET = 'KITNET',
}

export enum CampusDistance {
  UP_TO_1_KM = 'UP_TO_1_KM',
  FROM_1_TO_3_KM = 'FROM_1_TO_3_KM',
  FROM_3_TO_5_KM = 'FROM_3_TO_5_KM',
  ANY = 'ANY',
}

// Total de moradores desejado, contando a própria pessoa.
export enum DesiredRoommates {
  ALONE = 'ALONE',
  TWO = 'TWO',
  THREE_TO_FOUR = 'THREE_TO_FOUR',
  FIVE_OR_MORE = 'FIVE_OR_MORE',
}

export enum RoommateGender {
  ANY = 'ANY',
  FEMALE = 'FEMALE',
  MALE = 'MALE',
}
