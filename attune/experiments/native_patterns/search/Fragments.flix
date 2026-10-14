// Generated native typed primitive constructors; no runtime source generation.
pub mod Fragments {
pub type alias Rules = #{ I(Attune.FileId, Attune.FileId), D(Attune.FileId, Attune.SymbolId), C(Attune.SymbolId, Attune.SymbolId), Step(String, Int32, Int32), St(String, Int32, Attune.FileId, Attune.FileId, Attune.FileId, Attune.SymbolId, Attune.SymbolId, Attune.SymbolId, Attune.SymbolId), Out(String, Attune.FileId, Attune.FileId) }
pub def atom(kind: Int32, left: Int32, right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (kind,left) {
case (0,0) => atom0_0(right,mask,identity,index)
case (0,1) => atom0_1(right,mask,identity,index)
case (0,2) => atom0_2(right,mask,identity,index)
case (1,0) => atom1_0(right,mask,identity,index)
case (1,1) => atom1_1(right,mask,identity,index)
case (1,2) => atom1_2(right,mask,identity,index)
case (2,3) => atom2_3(right,mask,identity,index)
case (2,4) => atom2_4(right,mask,identity,index)
case (2,5) => atom2_5(right,mask,identity,index)
case (2,6) => atom2_6(right,mask,identity,index)
case _ => #{}
}
def atom0_0(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (0,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f0), if(p == identity), if(k == index). }
case (0,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f0), if(p == identity), if(k == index). }
case (1,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f1), if(p == identity), if(k == index). }
case (1,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f1), if(p == identity), if(k == index). }
case (1,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f1), if(p == identity), if(k == index). }
case (1,3) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f1), if(p == identity), if(k == index). }
case (2,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f0, f2), if(p == identity), if(k == index). }
case (2,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f2), if(p == identity), if(k == index). }
case (2,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f0, f2), if(p == identity), if(k == index). }
case (2,5) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f0, f2), if(p == identity), if(k == index). }
case _ => #{}
}
def atom0_1(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (0,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f0), if(p == identity), if(k == index). }
case (0,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f0), if(p == identity), if(k == index). }
case (0,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f0), if(p == identity), if(k == index). }
case (0,3) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f0), if(p == identity), if(k == index). }
case (1,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f1), if(p == identity), if(k == index). }
case (1,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f1), if(p == identity), if(k == index). }
case (2,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f1, f2), if(p == identity), if(k == index). }
case (2,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f2), if(p == identity), if(k == index). }
case (2,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f1, f2), if(p == identity), if(k == index). }
case (2,6) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f1, f2), if(p == identity), if(k == index). }
case _ => #{}
}
def atom0_2(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (0,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f2, f0), if(p == identity), if(k == index). }
case (0,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f2, f0), if(p == identity), if(k == index). }
case (0,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f2, f0), if(p == identity), if(k == index). }
case (0,5) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f2, f0), if(p == identity), if(k == index). }
case (1,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f2, f1), if(p == identity), if(k == index). }
case (1,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), I(f2, f1), if(p == identity), if(k == index). }
case (1,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f2, f1), if(p == identity), if(k == index). }
case (1,6) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f2, f1), if(p == identity), if(k == index). }
case (2,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), I(f2, f2), if(p == identity), if(k == index). }
case (2,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), I(f2, f2), if(p == identity), if(k == index). }
case _ => #{}
}
def atom1_0(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (3,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), D(f0, s0), if(p == identity), if(k == index). }
case (3,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s0), if(p == identity), if(k == index). }
case (3,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), D(f0, s0), if(p == identity), if(k == index). }
case (3,9) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s0), if(p == identity), if(k == index). }
case (4,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), D(f0, s1), if(p == identity), if(k == index). }
case (4,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s1), if(p == identity), if(k == index). }
case (4,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), D(f0, s1), if(p == identity), if(k == index). }
case (4,17) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s1), if(p == identity), if(k == index). }
case (5,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), D(f0, s2), if(p == identity), if(k == index). }
case (5,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s2), if(p == identity), if(k == index). }
case (5,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), D(f0, s2), if(p == identity), if(k == index). }
case (5,33) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s2), if(p == identity), if(k == index). }
case (6,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), D(f0, s3), if(p == identity), if(k == index). }
case (6,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,oldf0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s3), if(p == identity), if(k == index). }
case (6,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), D(f0, s3), if(p == identity), if(k == index). }
case (6,65) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f0, s3), if(p == identity), if(k == index). }
case _ => #{}
}
def atom1_1(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (3,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, olds0, s1, s2, s3), Step(p,k,n), D(f1, s0), if(p == identity), if(k == index). }
case (3,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s0), if(p == identity), if(k == index). }
case (3,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), D(f1, s0), if(p == identity), if(k == index). }
case (3,10) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s0), if(p == identity), if(k == index). }
case (4,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, olds1, s2, s3), Step(p,k,n), D(f1, s1), if(p == identity), if(k == index). }
case (4,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s1), if(p == identity), if(k == index). }
case (4,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), D(f1, s1), if(p == identity), if(k == index). }
case (4,18) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s1), if(p == identity), if(k == index). }
case (5,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, olds2, s3), Step(p,k,n), D(f1, s2), if(p == identity), if(k == index). }
case (5,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s2), if(p == identity), if(k == index). }
case (5,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), D(f1, s2), if(p == identity), if(k == index). }
case (5,34) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s2), if(p == identity), if(k == index). }
case (6,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, olds3), Step(p,k,n), D(f1, s3), if(p == identity), if(k == index). }
case (6,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, oldf1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s3), if(p == identity), if(k == index). }
case (6,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), D(f1, s3), if(p == identity), if(k == index). }
case (6,66) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f1, s3), if(p == identity), if(k == index). }
case _ => #{}
}
def atom1_2(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (3,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, olds0, s1, s2, s3), Step(p,k,n), D(f2, s0), if(p == identity), if(k == index). }
case (3,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), D(f2, s0), if(p == identity), if(k == index). }
case (3,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), D(f2, s0), if(p == identity), if(k == index). }
case (3,12) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f2, s0), if(p == identity), if(k == index). }
case (4,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, olds1, s2, s3), Step(p,k,n), D(f2, s1), if(p == identity), if(k == index). }
case (4,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), D(f2, s1), if(p == identity), if(k == index). }
case (4,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), D(f2, s1), if(p == identity), if(k == index). }
case (4,20) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f2, s1), if(p == identity), if(k == index). }
case (5,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, olds2, s3), Step(p,k,n), D(f2, s2), if(p == identity), if(k == index). }
case (5,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), D(f2, s2), if(p == identity), if(k == index). }
case (5,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), D(f2, s2), if(p == identity), if(k == index). }
case (5,36) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f2, s2), if(p == identity), if(k == index). }
case (6,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, olds3), Step(p,k,n), D(f2, s3), if(p == identity), if(k == index). }
case (6,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, oldf2, s0, s1, s2, s3), Step(p,k,n), D(f2, s3), if(p == identity), if(k == index). }
case (6,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), D(f2, s3), if(p == identity), if(k == index). }
case (6,68) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), D(f2, s3), if(p == identity), if(k == index). }
case _ => #{}
}
def atom2_3(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (3,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), C(s0, s0), if(p == identity), if(k == index). }
case (3,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s0, s0), if(p == identity), if(k == index). }
case (4,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, olds1, s2, s3), Step(p,k,n), C(s0, s1), if(p == identity), if(k == index). }
case (4,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), C(s0, s1), if(p == identity), if(k == index). }
case (4,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), C(s0, s1), if(p == identity), if(k == index). }
case (4,24) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s0, s1), if(p == identity), if(k == index). }
case (5,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, olds2, s3), Step(p,k,n), C(s0, s2), if(p == identity), if(k == index). }
case (5,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), C(s0, s2), if(p == identity), if(k == index). }
case (5,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), C(s0, s2), if(p == identity), if(k == index). }
case (5,40) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s0, s2), if(p == identity), if(k == index). }
case (6,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, olds3), Step(p,k,n), C(s0, s3), if(p == identity), if(k == index). }
case (6,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), C(s0, s3), if(p == identity), if(k == index). }
case (6,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), C(s0, s3), if(p == identity), if(k == index). }
case (6,72) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s0, s3), if(p == identity), if(k == index). }
case _ => #{}
}
def atom2_4(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (3,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, olds1, s2, s3), Step(p,k,n), C(s1, s0), if(p == identity), if(k == index). }
case (3,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), C(s1, s0), if(p == identity), if(k == index). }
case (3,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), C(s1, s0), if(p == identity), if(k == index). }
case (3,24) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s1, s0), if(p == identity), if(k == index). }
case (4,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), C(s1, s1), if(p == identity), if(k == index). }
case (4,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s1, s1), if(p == identity), if(k == index). }
case (5,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, olds2, s3), Step(p,k,n), C(s1, s2), if(p == identity), if(k == index). }
case (5,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), C(s1, s2), if(p == identity), if(k == index). }
case (5,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), C(s1, s2), if(p == identity), if(k == index). }
case (5,48) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s1, s2), if(p == identity), if(k == index). }
case (6,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, olds3), Step(p,k,n), C(s1, s3), if(p == identity), if(k == index). }
case (6,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), C(s1, s3), if(p == identity), if(k == index). }
case (6,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), C(s1, s3), if(p == identity), if(k == index). }
case (6,80) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s1, s3), if(p == identity), if(k == index). }
case _ => #{}
}
def atom2_5(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (3,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, olds2, s3), Step(p,k,n), C(s2, s0), if(p == identity), if(k == index). }
case (3,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), C(s2, s0), if(p == identity), if(k == index). }
case (3,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), C(s2, s0), if(p == identity), if(k == index). }
case (3,40) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s2, s0), if(p == identity), if(k == index). }
case (4,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, olds2, s3), Step(p,k,n), C(s2, s1), if(p == identity), if(k == index). }
case (4,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), C(s2, s1), if(p == identity), if(k == index). }
case (4,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), C(s2, s1), if(p == identity), if(k == index). }
case (4,48) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s2, s1), if(p == identity), if(k == index). }
case (5,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), C(s2, s2), if(p == identity), if(k == index). }
case (5,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s2, s2), if(p == identity), if(k == index). }
case (6,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, olds3), Step(p,k,n), C(s2, s3), if(p == identity), if(k == index). }
case (6,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), C(s2, s3), if(p == identity), if(k == index). }
case (6,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), C(s2, s3), if(p == identity), if(k == index). }
case (6,96) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s2, s3), if(p == identity), if(k == index). }
case _ => #{}
}
def atom2_6(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {
case (3,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, olds3), Step(p,k,n), C(s3, s0), if(p == identity), if(k == index). }
case (3,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, olds0, s1, s2, s3), Step(p,k,n), C(s3, s0), if(p == identity), if(k == index). }
case (3,8) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), C(s3, s0), if(p == identity), if(k == index). }
case (3,72) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s3, s0), if(p == identity), if(k == index). }
case (4,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, olds3), Step(p,k,n), C(s3, s1), if(p == identity), if(k == index). }
case (4,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, olds1, s2, s3), Step(p,k,n), C(s3, s1), if(p == identity), if(k == index). }
case (4,16) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), C(s3, s1), if(p == identity), if(k == index). }
case (4,80) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s3, s1), if(p == identity), if(k == index). }
case (5,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, olds3), Step(p,k,n), C(s3, s2), if(p == identity), if(k == index). }
case (5,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, olds2, s3), Step(p,k,n), C(s3, s2), if(p == identity), if(k == index). }
case (5,32) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), C(s3, s2), if(p == identity), if(k == index). }
case (5,96) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s3, s2), if(p == identity), if(k == index). }
case (6,0) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, olds3), Step(p,k,n), C(s3, s3), if(p == identity), if(k == index). }
case (6,64) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), C(s3, s3), if(p == identity), if(k == index). }
case _ => #{}
}
pub def different(left: Int32, right: Int32, identity: String, index: Int32): Rules = match (left,right) {
case (0,1) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(f0 != f1). }
case (0,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(f0 != f2). }
case (1,2) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(f1 != f2). }
case (3,4) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(s0 != s1). }
case (3,5) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(s0 != s2). }
case (3,6) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(s0 != s3). }
case (4,5) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(s1 != s2). }
case (4,6) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(s1 != s3). }
case (5,6) => #{ St(p,n,f0, f1, f2, s0, s1, s2, s3) :- St(p,k,f0, f1, f2, s0, s1, s2, s3), Step(p,k,n), if(p == identity), if(k == index), if(s2 != s3). }
case _ => #{}
}
pub def finish(identity: String, count: Int32): Rules = #{ Out(p,a,b) :- St(p,k,a,b,_,_,_,_,_), if(p == identity), if(k == count). }
}
