
import {Column, Entity, Model} from "../index";

@Entity({expires: 100})
export class Person extends Model {

    //@PrimaryGeneratedColumn()
    //id: number;

    @Column({unique: true})
    email: string;

    @Column({type: 'integer', index: true})
    age: number;

    @Column({type: 'float', index: true})
    score: number;

    @Column({index: true})
    fullName: string;

    @Column({index: true})
    lastIp: string;

    @Column({index: true})
    lastLogin: Date;

    @Column({type: 'json'})
    preferences: object;

    @Column({type: 'array'})
    tags: string[];

    @Column({default: 'user', index: true})
    level: string;

    @Column({default: 'active', index: true})
    status: string;

}