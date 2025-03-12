export interface Query {
    $lt?: number;
    $lte?: number;
    $gt?: number;
    $gte?: number;
    limit?: number;
    order?: 'ASC' | 'DESC';
    scores?: boolean;
}
